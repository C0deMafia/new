from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import asyncio
import json
import httpx
import re
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'repo_to_podcast')]

# Create audio storage directory
AUDIO_STORAGE_PATH = Path(os.environ.get('AUDIO_STORAGE_PATH', './audio_files'))
AUDIO_STORAGE_PATH.mkdir(exist_ok=True)

# Create the main app
app = FastAPI(title="Repo-to-Podcast API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= ENUMS & MODELS =============

class NarrativeStyle(str, Enum):
    TRUE_CRIME = "true-crime"
    SPORTS = "sports"
    DOCUMENTARY = "documentary"
    COMEDY = "comedy"

class AnalysisStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    GENERATING_SCRIPT = "generating_script"
    GENERATING_AUDIO = "generating_audio"
    COMPLETED = "completed"
    FAILED = "failed"

class RepoAnalyzeRequest(BaseModel):
    repo_url: str
    narrative_style: NarrativeStyle = NarrativeStyle.TRUE_CRIME

class ScriptSegment(BaseModel):
    speaker: str
    text: str
    duration: float = 0
    sound_effect: Optional[str] = None
    emotion: str = "neutral"
    code_reference: Optional[Dict[str, Any]] = None

class PodcastScript(BaseModel):
    title: str
    narrator_voice: str = "detective"
    segments: List[ScriptSegment]
    total_duration: float = 0
    dramatic_arc: str = ""

class Podcast(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    repo_url: str
    repo_name: str
    title: str
    narrative_style: NarrativeStyle
    status: AnalysisStatus = AnalysisStatus.PENDING
    progress: int = 0
    progress_message: str = ""
    script: Optional[Dict] = None
    audio_url: Optional[str] = None
    audio_filename: Optional[str] = None
    duration: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    repo_metadata: Optional[Dict] = None
    patterns_found: List[str] = []
    error_message: Optional[str] = None

class CodePattern(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pattern_name: str
    category: str
    severity: str
    detection_keywords: List[str]
    dramatic_narrative: Dict[str, str]
    occurrences: int = 0
    solutions: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnalysisJob(BaseModel):
    id: str
    status: AnalysisStatus
    progress: int
    message: str

# ============= GITHUB PARSER =============

async def parse_github_url(url: str) -> Dict[str, str]:
    """Extract owner and repo from GitHub URL"""
    patterns = [
        r"github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/.*)?$",
        r"^([^/]+)/([^/]+)$"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return {"owner": match.group(1), "repo": match.group(2).rstrip('/')}
    
    raise ValueError(f"Invalid GitHub URL: {url}")

async def fetch_repo_content(owner: str, repo: str) -> Dict:
    """Fetch repository structure and important files"""
    github_token = os.environ.get('GITHUB_TOKEN', '')
    headers = {"Accept": "application/vnd.github.v3+json"}
    if github_token:
        headers["Authorization"] = f"token {github_token}"
    
    async with httpx.AsyncClient() as client:
        # Get repo metadata
        repo_url = f"https://api.github.com/repos/{owner}/{repo}"
        repo_resp = await client.get(repo_url, headers=headers)
        
        if repo_resp.status_code != 200:
            raise HTTPException(status_code=404, detail=f"Repository not found: {owner}/{repo}")
        
        repo_data = repo_resp.json()
        
        # Get repo tree
        default_branch = repo_data.get('default_branch', 'main')
        tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
        tree_resp = await client.get(tree_url, headers=headers)
        
        files = []
        if tree_resp.status_code == 200:
            tree_data = tree_resp.json()
            files = [item for item in tree_data.get('tree', []) if item['type'] == 'blob']
        
        # Prioritize important files
        important_patterns = [
            'README.md', 'readme.md', 'README.MD',
            'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod',
            'index.js', 'index.ts', 'main.py', 'app.py', 'server.py',
            'src/index.js', 'src/main.js', 'src/App.js', 'src/app.py'
        ]
        
        selected_files = []
        file_contents = {}
        
        # Get important files first
        for pattern in important_patterns:
            for f in files:
                if f['path'].endswith(pattern.split('/')[-1]) or f['path'] == pattern:
                    if f['path'] not in [sf['path'] for sf in selected_files]:
                        selected_files.append(f)
                        if len(selected_files) >= 15:
                            break
            if len(selected_files) >= 15:
                break
        
        # Add some source files
        source_extensions = ['.js', '.ts', '.py', '.go', '.rs', '.java', '.jsx', '.tsx']
        for f in files:
            if len(selected_files) >= 20:
                break
            if any(f['path'].endswith(ext) for ext in source_extensions):
                if f['path'] not in [sf['path'] for sf in selected_files]:
                    selected_files.append(f)
        
        # Fetch content for selected files
        for f in selected_files[:15]:  # Limit to 15 files
            try:
                content_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{f['path']}"
                content_resp = await client.get(content_url, headers=headers)
                if content_resp.status_code == 200:
                    content_data = content_resp.json()
                    if 'content' in content_data:
                        import base64
                        decoded = base64.b64decode(content_data['content']).decode('utf-8', errors='ignore')
                        # Limit content size
                        file_contents[f['path']] = decoded[:5000]
            except Exception as e:
                logger.warning(f"Could not fetch {f['path']}: {e}")
        
        # Get recent commits
        commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=5"
        commits_resp = await client.get(commits_url, headers=headers)
        recent_commits = []
        if commits_resp.status_code == 200:
            recent_commits = [{
                'sha': c['sha'][:7],
                'message': c['commit']['message'][:100],
                'author': c['commit']['author']['name']
            } for c in commits_resp.json()[:5]]
        
        return {
            'metadata': {
                'name': repo_data['name'],
                'full_name': repo_data['full_name'],
                'description': repo_data.get('description', ''),
                'stars': repo_data['stargazers_count'],
                'forks': repo_data['forks_count'],
                'language': repo_data.get('language', 'Unknown'),
                'created_at': repo_data['created_at'],
                'updated_at': repo_data['updated_at'],
                'topics': repo_data.get('topics', []),
                'default_branch': default_branch
            },
            'files': [f['path'] for f in selected_files],
            'file_contents': file_contents,
            'recent_commits': recent_commits,
            'stats': {
                'total_files': len(files),
                'analyzed_files': len(file_contents)
            }
        }

# ============= PATTERN DETECTION =============

DEFAULT_PATTERNS = [
    {
        "pattern_name": "useEffect-infinite-loop",
        "category": "react-hooks",
        "severity": "critical",
        "detection_keywords": ["useEffect", "setState", "useState"],
        "dramatic_narrative": {
            "setup": "The developer thought they understood React hooks...",
            "climax": "But the component re-rendered. Again. And again...",
            "resolution": "Until they discovered the missing dependency array."
        },
        "solutions": ["Add dependency array", "Use useCallback"]
    },
    {
        "pattern_name": "callback-hell",
        "category": "async-patterns",
        "severity": "warning",
        "detection_keywords": ["callback", ".then(", "function("],
        "dramatic_narrative": {
            "setup": "Nested deeper than the Mariana Trench...",
            "climax": "Each callback led to another, a labyrinth of promises unkept.",
            "resolution": "async/await emerged as the hero we needed."
        },
        "solutions": ["Use async/await", "Promise.all for parallel operations"]
    },
    {
        "pattern_name": "memory-leak-event-listener",
        "category": "memory-leaks",
        "severity": "critical",
        "detection_keywords": ["addEventListener", "removeEventListener", "window.", "document."],
        "dramatic_narrative": {
            "setup": "They added a listener, innocent enough...",
            "climax": "But they never removed it. Memory grew. And grew.",
            "resolution": "A cleanup function was the only way out."
        },
        "solutions": ["Remove event listeners on unmount", "Use cleanup in useEffect"]
    },
    {
        "pattern_name": "sql-injection-risk",
        "category": "security",
        "severity": "critical",
        "detection_keywords": ["SELECT", "INSERT", "UPDATE", "DELETE", "query(", "execute("],
        "dramatic_narrative": {
            "setup": "A simple query, they thought...",
            "climax": "But Bobby Tables had other plans.",
            "resolution": "Parameterized queries became their shield."
        },
        "solutions": ["Use parameterized queries", "Implement input validation"]
    },
    {
        "pattern_name": "god-object",
        "category": "architecture",
        "severity": "warning",
        "detection_keywords": ["class ", "function ", "const ", "let ", "var "],
        "dramatic_narrative": {
            "setup": "One file to rule them all...",
            "climax": "It knew too much. Did too much. Was too much.",
            "resolution": "Separation of concerns would set it free."
        },
        "solutions": ["Split into smaller modules", "Apply Single Responsibility Principle"]
    },
    {
        "pattern_name": "hardcoded-secrets",
        "category": "security",
        "severity": "critical",
        "detection_keywords": ["API_KEY", "SECRET", "PASSWORD", "TOKEN", "apiKey", "secret"],
        "dramatic_narrative": {
            "setup": "The key was right there, in plain sight...",
            "climax": "Anyone could see it. Anyone could use it.",
            "resolution": "Environment variables became their vault."
        },
        "solutions": ["Use environment variables", "Implement secret management"]
    },
    {
        "pattern_name": "unhandled-promise-rejection",
        "category": "async-bugs",
        "severity": "warning",
        "detection_keywords": [".then(", "async ", "await ", "Promise"],
        "dramatic_narrative": {
            "setup": "The promise was made...",
            "climax": "But when it broke, no one was there to catch the pieces.",
            "resolution": "try-catch became their safety net."
        },
        "solutions": ["Add try-catch blocks", "Use .catch() handlers"]
    },
    {
        "pattern_name": "n-plus-one-query",
        "category": "performance",
        "severity": "warning",
        "detection_keywords": ["for ", "forEach", "map(", "find(", "query"],
        "dramatic_narrative": {
            "setup": "One query seemed harmless...",
            "climax": "But in the loop, it multiplied. N times plus one.",
            "resolution": "Eager loading was the optimization they needed."
        },
        "solutions": ["Use eager loading", "Batch database queries"]
    }
]

async def detect_patterns(file_contents: Dict[str, str]) -> List[Dict]:
    """Detect code patterns in file contents"""
    found_patterns = []
    all_content = "\n".join(file_contents.values()).lower()
    
    for pattern in DEFAULT_PATTERNS:
        keyword_matches = sum(1 for kw in pattern['detection_keywords'] if kw.lower() in all_content)
        if keyword_matches >= 2:  # At least 2 keywords must match
            found_patterns.append({
                **pattern,
                'match_score': keyword_matches,
                'matched_files': [
                    path for path, content in file_contents.items()
                    if any(kw.lower() in content.lower() for kw in pattern['detection_keywords'])
                ][:3]
            })
    
    # Sort by severity and match score
    severity_order = {'critical': 0, 'warning': 1, 'info': 2}
    found_patterns.sort(key=lambda x: (severity_order.get(x['severity'], 3), -x['match_score']))
    
    return found_patterns[:5]  # Return top 5 patterns

# ============= SCRIPT GENERATION =============

NARRATIVE_PROMPTS = {
    NarrativeStyle.TRUE_CRIME: """You are a True Crime podcast narrator with a dramatic, mysterious voice. 
Write like you're uncovering a dark secret. Use suspenseful pauses, dramatic revelations, and build tension.
Style: "It was a quiet Tuesday morning when the developer opened their IDE... little did they know, lurking in line 42...""",
    
    NarrativeStyle.SPORTS: """You are an excited sports commentator narrating code like it's the championship game.
Use high energy, play-by-play style, and celebrate wins while dramatically describing failures.
Style: "AND THE FUNCTION RETURNS! THE CROWD GOES WILD! But wait... what's this? A NULL POINTER EXCEPTION!""",
    
    NarrativeStyle.DOCUMENTARY: """You are David Attenborough narrating a nature documentary about code.
Observe patterns in their natural habitat with curiosity and wonder.
Style: "Here we observe the async/await pattern in its natural habitat. Notice how it gracefully handles the promise...""",
    
    NarrativeStyle.COMEDY: """You are a stand-up comedian roasting someone's code.
Be funny, sarcastic, but ultimately helpful. Make jokes about common mistakes.
Style: "Buddy, who hurt you? Why are you writing code like this? Did your keyboard have a stroke?"""
}

async def generate_script(repo_data: Dict, patterns: List[Dict], style: NarrativeStyle) -> Dict:
    """Generate podcast script using Gemini"""
    emergent_key = os.environ.get('EMERGENT_LLM_KEY', '')
    
    if not emergent_key:
        # Return a demo script if no API key
        return generate_demo_script(repo_data, patterns, style)
    
    try:
        from emergentintegrations.llm.gemini import GeminiClient
        
        gemini = GeminiClient(api_key=emergent_key)
        
        prompt = f"""{NARRATIVE_PROMPTS[style]}

You are creating a podcast script about the GitHub repository: {repo_data['metadata']['name']}

Repository Info:
- Name: {repo_data['metadata']['name']}
- Description: {repo_data['metadata'].get('description', 'No description')}
- Stars: {repo_data['metadata']['stars']}
- Language: {repo_data['metadata']['language']}
- Files analyzed: {repo_data['stats']['analyzed_files']}

Recent commits:
{json.dumps(repo_data.get('recent_commits', []), indent=2)}

Code patterns detected:
{json.dumps([{{'name': p['pattern_name'], 'severity': p['severity'], 'category': p['category'], 'narrative': p['dramatic_narrative']}} for p in patterns], indent=2)}

Sample code files:
{json.dumps(list(repo_data.get('file_contents', {{}}).keys()), indent=2)}

Generate a 5-7 minute podcast script in JSON format with this EXACT structure:
{{{{
  "title": "Catchy True Crime style title for this repo",
  "segments": [
    {{{{
      "speaker": "narrator",
      "text": "Opening hook - dramatic intro",
      "duration": 10,
      "sound_effect": "suspenseful-drone",
      "emotion": "mysterious"
    }}}},
    ... more segments ...
  ],
  "dramatic_arc": "setup → discovery → investigation → revelation → resolution"
}}}}

Rules:
1. Use two speakers: "narrator" (main dramatic voice) and "expert" (analytical tech expert)
2. Include 8-12 segments
3. Reference actual patterns found with dramatic flair
4. Add sound_effect cues: "keyboard-typing", "suspenseful-drone", "dramatic-sting", "heartbeat-suspense", "victory-chime"
5. Keep each segment 5-20 seconds (short, punchy sentences for audio)
6. Make it entertaining AND educational
7. End with a satisfying resolution

Return ONLY valid JSON, no markdown formatting."""

        response = await gemini.chat(
            user_prompt=prompt,
            system_prompt="You are a professional podcast script writer. Return only valid JSON.",
            model="gemini-2.0-flash"
        )
        
        # Parse JSON response
        try:
            # Clean up response - remove markdown code blocks if present
            response_text = response.strip()
            if response_text.startswith('```'):
                response_text = re.sub(r'^```json?\n?', '', response_text)
                response_text = re.sub(r'\n?```$', '', response_text)
            
            script_data = json.loads(response_text)
            return script_data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return generate_demo_script(repo_data, patterns, style)
            
    except Exception as e:
        logger.error(f"Error generating script with Gemini: {e}")
        return generate_demo_script(repo_data, patterns, style)

def generate_demo_script(repo_data: Dict, patterns: List[Dict], style: NarrativeStyle) -> Dict:
    """Generate a demo script without API"""
    repo_name = repo_data['metadata']['name']
    language = repo_data['metadata'].get('language', 'Unknown')
    
    pattern_names = [p['pattern_name'] for p in patterns[:3]] if patterns else ['mysterious code', 'hidden complexity']
    
    return {
        "title": f"The {repo_name} Files: A Code Investigation",
        "segments": [
            {
                "speaker": "narrator",
                "text": f"It was just another repository on GitHub. {repo_name}, they called it. But beneath its innocent README... lurked something far more sinister.",
                "duration": 12,
                "sound_effect": "suspenseful-drone",
                "emotion": "mysterious"
            },
            {
                "speaker": "narrator", 
                "text": f"Written in {language}, with {repo_data['metadata']['stars']} stars watching its every commit. Someone, or something, had been building in the shadows.",
                "duration": 10,
                "sound_effect": "keyboard-typing",
                "emotion": "tense"
            },
            {
                "speaker": "expert",
                "text": f"When I first opened the codebase, I noticed something immediately. The patterns... they were everywhere. {pattern_names[0] if pattern_names else 'Complex structures'} hiding in plain sight.",
                "duration": 11,
                "sound_effect": None,
                "emotion": "analytical"
            },
            {
                "speaker": "narrator",
                "text": f"Our expert had seen this before. {len(patterns)} suspicious patterns detected. Each one, a potential crime scene.",
                "duration": 9,
                "sound_effect": "dramatic-sting",
                "emotion": "revelation"
            },
            {
                "speaker": "narrator",
                "text": f"The investigation led us through {repo_data['stats']['analyzed_files']} files. Each one revealing more of the truth.",
                "duration": 8,
                "sound_effect": "heartbeat-suspense",
                "emotion": "tense"
            },
            {
                "speaker": "expert",
                "text": f"The most critical finding? {patterns[0]['dramatic_narrative']['climax'] if patterns else 'Complexity beyond measure. But also... potential beyond imagination.'}" ,
                "duration": 10,
                "sound_effect": None,
                "emotion": "serious"
            },
            {
                "speaker": "narrator",
                "text": "But every crime has a solution. Every bug, a fix. And in this repository... redemption was possible.",
                "duration": 9,
                "sound_effect": "suspenseful-drone",
                "emotion": "hopeful"
            },
            {
                "speaker": "expert",
                "text": f"With proper refactoring and attention to these patterns, this codebase could transform from suspect... to exemplary.",
                "duration": 10,
                "sound_effect": None,
                "emotion": "optimistic"
            },
            {
                "speaker": "narrator",
                "text": f"And so the case of {repo_name} closes... for now. But remember, in the world of code, the next mystery is always just one commit away.",
                "duration": 12,
                "sound_effect": "victory-chime",
                "emotion": "conclusion"
            }
        ],
        "dramatic_arc": "setup → discovery → investigation → revelation → resolution"
    }

# ============= AUDIO GENERATION =============

async def generate_audio(script: Dict, podcast_id: str) -> Optional[str]:
    """Generate audio using ElevenLabs"""
    elevenlabs_key = os.environ.get('ELEVENLABS_API_KEY', '')
    
    if not elevenlabs_key or elevenlabs_key == 'your_elevenlabs_api_key_here':
        logger.warning("No ElevenLabs API key configured, skipping audio generation")
        return None
    
    try:
        # Voice IDs for different speakers
        voices = {
            "narrator": "21m00Tcm4TlvDq8ikWAM",  # Rachel - dramatic narrator
            "expert": "AZnzlk1XvdvUeBnXmlld"    # Domi - analytical expert
        }
        
        audio_chunks = []
        
        async with httpx.AsyncClient() as client:
            for segment in script.get('segments', []):
                speaker = segment.get('speaker', 'narrator')
                text = segment.get('text', '')
                voice_id = voices.get(speaker, voices['narrator'])
                
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                headers = {
                    "Accept": "audio/mpeg",
                    "Content-Type": "application/json",
                    "xi-api-key": elevenlabs_key
                }
                
                payload = {
                    "text": text,
                    "model_id": "eleven_monolingual_v1",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
                
                response = await client.post(url, json=payload, headers=headers, timeout=60.0)
                
                if response.status_code == 200:
                    audio_chunks.append(response.content)
                else:
                    logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
        
        if audio_chunks:
            # Combine audio chunks (simple concatenation for MP3)
            combined_audio = b''.join(audio_chunks)
            
            # Save to file
            filename = f"podcast_{podcast_id}.mp3"
            filepath = AUDIO_STORAGE_PATH / filename
            
            with open(filepath, 'wb') as f:
                f.write(combined_audio)
            
            return filename
    
    except Exception as e:
        logger.error(f"Error generating audio: {e}")
    
    return None

# ============= BACKGROUND TASK =============

async def process_podcast_generation(podcast_id: str, repo_url: str, style: NarrativeStyle):
    """Background task to process podcast generation"""
    try:
        # Update status: Analyzing
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {"status": AnalysisStatus.ANALYZING, "progress": 10, "progress_message": "Fetching repository data..."}}
        )
        
        # Parse GitHub URL
        parsed = await parse_github_url(repo_url)
        
        # Fetch repo content
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {"progress": 25, "progress_message": "Analyzing code structure..."}}
        )
        
        repo_data = await fetch_repo_content(parsed['owner'], parsed['repo'])
        
        # Detect patterns
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {"progress": 40, "progress_message": "Detecting code patterns..."}}
        )
        
        patterns = await detect_patterns(repo_data.get('file_contents', {}))
        
        # Update with repo metadata
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {
                "repo_name": repo_data['metadata']['name'],
                "repo_metadata": repo_data['metadata'],
                "patterns_found": [p['pattern_name'] for p in patterns]
            }}
        )
        
        # Generate script
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {"status": AnalysisStatus.GENERATING_SCRIPT, "progress": 55, "progress_message": "Writing dramatic script..."}}
        )
        
        script = await generate_script(repo_data, patterns, style)
        
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {
                "script": script,
                "title": script.get('title', f"The {repo_data['metadata']['name']} Files")
            }}
        )
        
        # Generate audio
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {"status": AnalysisStatus.GENERATING_AUDIO, "progress": 75, "progress_message": "Generating audio narration..."}}
        )
        
        audio_filename = await generate_audio(script, podcast_id)
        
        # Calculate duration from segments
        total_duration = sum(s.get('duration', 8) for s in script.get('segments', []))
        
        # Complete
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {
                "status": AnalysisStatus.COMPLETED,
                "progress": 100,
                "progress_message": "Podcast ready!",
                "audio_filename": audio_filename,
                "audio_url": f"/api/audio/{audio_filename}" if audio_filename else None,
                "duration": total_duration,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update pattern occurrences in DB
        for pattern in patterns:
            await db.code_patterns.update_one(
                {"pattern_name": pattern['pattern_name']},
                {
                    "$inc": {"occurrences": 1},
                    "$setOnInsert": {
                        "id": str(uuid.uuid4()),
                        "category": pattern['category'],
                        "severity": pattern['severity'],
                        "detection_keywords": pattern['detection_keywords'],
                        "dramatic_narrative": pattern['dramatic_narrative'],
                        "solutions": pattern.get('solutions', []),
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
        
        logger.info(f"Podcast generation completed: {podcast_id}")
        
    except Exception as e:
        logger.error(f"Error in podcast generation: {e}")
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$set": {
                "status": AnalysisStatus.FAILED,
                "error_message": str(e),
                "progress_message": f"Error: {str(e)}"
            }}
        )

# ============= API ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "Repo-to-Podcast API", "version": "1.0.0"}

@api_router.post("/analyze")
async def analyze_repository(request: RepoAnalyzeRequest, background_tasks: BackgroundTasks):
    """Start analyzing a GitHub repository"""
    podcast_id = str(uuid.uuid4())
    
    # Create initial podcast record
    podcast = {
        "id": podcast_id,
        "repo_url": request.repo_url,
        "repo_name": "",
        "title": "",
        "narrative_style": request.narrative_style,
        "status": AnalysisStatus.PENDING,
        "progress": 0,
        "progress_message": "Starting analysis...",
        "script": None,
        "audio_url": None,
        "audio_filename": None,
        "duration": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "repo_metadata": None,
        "patterns_found": [],
        "error_message": None
    }
    
    await db.podcasts.insert_one(podcast)
    
    # Start background processing
    background_tasks.add_task(
        process_podcast_generation,
        podcast_id,
        request.repo_url,
        request.narrative_style
    )
    
    return {"id": podcast_id, "status": "processing"}

@api_router.get("/analyze/{podcast_id}/status")
async def get_analysis_status(podcast_id: str):
    """Get the status of podcast generation"""
    podcast = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    return {
        "id": podcast_id,
        "status": podcast['status'],
        "progress": podcast['progress'],
        "message": podcast['progress_message'],
        "title": podcast.get('title', ''),
        "error": podcast.get('error_message')
    }

@api_router.get("/podcasts")
async def list_podcasts(
    limit: int = Query(default=20, le=100),
    skip: int = Query(default=0, ge=0)
):
    """List all generated podcasts"""
    podcasts = await db.podcasts.find(
        {"status": AnalysisStatus.COMPLETED},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.podcasts.count_documents({"status": AnalysisStatus.COMPLETED})
    
    return {
        "podcasts": podcasts,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/podcasts/{podcast_id}")
async def get_podcast(podcast_id: str):
    """Get a specific podcast"""
    podcast = await db.podcasts.find_one({"id": podcast_id}, {"_id": 0})
    
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    return podcast

@api_router.get("/patterns")
async def list_patterns():
    """Get pattern database statistics"""
    patterns = await db.code_patterns.find({}, {"_id": 0}).sort("occurrences", -1).to_list(100)
    
    # Add default patterns if DB is empty
    if not patterns:
        patterns = [{
            "id": str(uuid.uuid4()),
            "pattern_name": p['pattern_name'],
            "category": p['category'],
            "severity": p['severity'],
            "occurrences": 0,
            "dramatic_narrative": p['dramatic_narrative'],
            "solutions": p.get('solutions', [])
        } for p in DEFAULT_PATTERNS]
    
    total_occurrences = sum(p.get('occurrences', 0) for p in patterns)
    
    return {
        "patterns": patterns,
        "total_patterns": len(patterns),
        "total_occurrences": total_occurrences,
        "categories": list(set(p.get('category', 'unknown') for p in patterns))
    }

@api_router.get("/patterns/{pattern_name}")
async def get_pattern(pattern_name: str):
    """Get a specific pattern"""
    pattern = await db.code_patterns.find_one({"pattern_name": pattern_name}, {"_id": 0})
    
    if not pattern:
        # Check default patterns
        for p in DEFAULT_PATTERNS:
            if p['pattern_name'] == pattern_name:
                return p
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    return pattern

@api_router.get("/audio/{filename}")
async def serve_audio(filename: str):
    """Serve audio files"""
    filepath = AUDIO_STORAGE_PATH / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        path=str(filepath),
        media_type="audio/mpeg",
        filename=filename
    )

@api_router.get("/stats")
async def get_stats():
    """Get overall statistics"""
    total_podcasts = await db.podcasts.count_documents({"status": AnalysisStatus.COMPLETED})
    total_patterns = await db.code_patterns.count_documents({})
    
    # Get pattern breakdown
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": "$occurrences"}}},
        {"$sort": {"count": -1}}
    ]
    category_stats = await db.code_patterns.aggregate(pipeline).to_list(100)
    
    # Get recent podcasts
    recent = await db.podcasts.find(
        {"status": AnalysisStatus.COMPLETED},
        {"_id": 0, "id": 1, "title": 1, "repo_name": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_podcasts": total_podcasts,
        "total_patterns": total_patterns if total_patterns > 0 else len(DEFAULT_PATTERNS),
        "category_breakdown": {s['_id']: s['count'] for s in category_stats} if category_stats else {},
        "recent_podcasts": recent
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
