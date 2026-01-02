import { useState, useEffect, useRef, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  Github,
  Mic,
  Search,
  AlertTriangle,
  Shield,
  Bug,
  Zap,
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Code,
  Radio,
  Eye,
  Star,
  GitFork,
  ExternalLink,
  Sparkles,
  Target,
  Skull,
  Fingerprint
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Narrative style options
const NARRATIVE_STYLES = [
  { id: "true-crime", name: "True Crime", icon: Skull, description: "Dark, mysterious, suspenseful" },
  { id: "sports", name: "Sports Commentary", icon: Zap, description: "High energy, exciting play-by-play" },
  { id: "documentary", name: "Documentary", icon: Eye, description: "Observational, educational, calm" },
  { id: "comedy", name: "Comedy Roast", icon: Sparkles, description: "Funny, sarcastic, entertaining" }
];

// Hero Section
const HeroSection = ({ onAnalyze, isAnalyzing }) => {
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("true-crime");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      onAnalyze(repoUrl.trim(), selectedStyle);
    }
  };

  return (
    <section className="min-h-screen noir-bg flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-600/10 rounded-full blur-2xl animate-float" style={{ animationDelay: "1s" }} />
      </div>

      {/* Crime Scene Tape */}
      <div className="absolute top-0 left-0 right-0 h-8 crime-tape opacity-30 rotate-1" />
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6" data-testid="hero-logo">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center animate-pulse-glow">
            <Mic className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight" data-testid="hero-headline">
          <span className="text-white">Your Code.</span>{" "}
          <span className="gradient-text">Your Crime Scene.</span>
          <br />
          <span className="text-white">Your Podcast.</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto" data-testid="hero-tagline">
          Transform any GitHub repository into a True Crime-style audio investigation. 
          <span className="text-red-500"> Every codebase has secrets.</span>
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8" data-testid="analyze-form">
          <div className="glass rounded-2xl p-2 flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex items-center gap-3 bg-black/30 rounded-xl px-4">
              <Github className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Paste GitHub repository URL..."
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 bg-transparent py-4 text-white placeholder-gray-500 focus:outline-none"
                disabled={isAnalyzing}
                data-testid="repo-url-input"
              />
            </div>
            <button
              type="submit"
              disabled={!repoUrl.trim() || isAnalyzing}
              className="btn-primary bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-4 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="analyze-button"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Investigating...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Investigate
                </>
              )}
            </button>
          </div>
        </form>

        {/* Narrative Style Selector */}
        <div className="max-w-2xl mx-auto" data-testid="style-selector">
          <p className="text-sm text-gray-500 mb-3">Choose your narrative style:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {NARRATIVE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={isAnalyzing}
                className={`p-3 rounded-xl transition-all ${
                  selectedStyle === style.id
                    ? "bg-red-600/20 border border-red-600 text-red-400"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
                data-testid={`style-${style.id}`}
              >
                <style.icon className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs font-medium">{style.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sample repos suggestion */}
        <div className="mt-8 text-sm text-gray-500" data-testid="sample-repos">
          <p className="mb-2">Try with popular repos:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["facebook/react", "vercel/next.js", "tailwindlabs/tailwindcss"].map((repo) => (
              <button
                key={repo}
                onClick={() => setRepoUrl(`https://github.com/${repo}`)}
                className="px-3 py-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                disabled={isAnalyzing}
              >
                {repo}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Analysis Progress Component
const AnalysisProgress = ({ status, onComplete }) => {
  const progressSteps = [
    { key: "pending", label: "Initializing investigation...", icon: Target },
    { key: "analyzing", label: "Fetching evidence from GitHub...", icon: Search },
    { key: "generating_script", label: "Crafting the narrative...", icon: FileText },
    { key: "generating_audio", label: "Recording the podcast...", icon: Mic },
    { key: "completed", label: "Case file complete!", icon: CheckCircle }
  ];

  const currentStepIndex = progressSteps.findIndex(s => s.key === status?.status);
  
  return (
    <section className="min-h-screen noir-bg flex items-center justify-center px-4 py-20">
      <div className="max-w-xl mx-auto text-center">
        {/* Animated Investigation Icon */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-full flex items-center justify-center">
            <Fingerprint className="w-16 h-16 text-red-500 animate-pulse" />
          </div>
          <div className="absolute inset-0 w-32 h-32 mx-auto border-4 border-red-500/30 rounded-full animate-ping" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-4" data-testid="progress-title">
          {status?.message || "Investigation in Progress..."}
        </h2>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-3 mb-8 overflow-hidden" data-testid="progress-bar">
          <div 
            className="progress-bar h-full rounded-full transition-all duration-500"
            style={{ width: `${status?.progress || 0}%` }}
          />
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {progressSteps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;
            const StepIcon = step.icon;
            
            return (
              <div 
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive ? "bg-red-600/10 border border-red-600/30" :
                  isComplete ? "bg-green-600/10 border border-green-600/30" :
                  "bg-white/5 border border-white/10"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? "bg-red-600 text-white" :
                  isComplete ? "bg-green-600 text-white" :
                  "bg-gray-700 text-gray-400"
                }`}>
                  {isComplete ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <span className={`text-sm ${
                  isActive ? "text-red-400" :
                  isComplete ? "text-green-400" :
                  "text-gray-500"
                }`}>
                  {step.label}
                </span>
                {isActive && <Loader2 className="w-4 h-4 text-red-400 animate-spin ml-auto" />}
              </div>
            );
          })}
        </div>

        {status?.error && (
          <div className="mt-6 p-4 bg-red-600/10 border border-red-600/30 rounded-xl text-red-400">
            <XCircle className="w-5 h-5 inline mr-2" />
            {status.error}
          </div>
        )}
      </div>
    </section>
  );
};

// Podcast Player Component
const PodcastPlayer = ({ podcast, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const audioRef = useRef(null);

  const segments = podcast?.script?.segments || [];
  
  // Calculate segment times
  const segmentTimes = segments.reduce((acc, segment, index) => {
    const prevTime = index > 0 ? acc[index - 1].end : 0;
    acc.push({
      start: prevTime,
      end: prevTime + (segment.duration || 8)
    });
    return acc;
  }, []);

  useEffect(() => {
    // Find active segment based on current time
    const activeIndex = segmentTimes.findIndex(
      (time) => currentTime >= time.start && currentTime < time.end
    );
    if (activeIndex !== -1) {
      setActiveSegmentIndex(activeIndex);
    }
  }, [currentTime, segmentTimes]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      // Simulate playback if no audio
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = (e.target.value / 100) * (duration || podcast?.duration || 90);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const skipTime = (seconds) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration || podcast?.duration || 90));
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  // Simulate playback progress if no audio
  useEffect(() => {
    let interval;
    if (isPlaying && !podcast?.audio_url) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const maxDuration = podcast?.duration || 90;
          if (prev >= maxDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, podcast?.audio_url, podcast?.duration]);

  const totalDuration = duration || podcast?.duration || 90;
  const progressPercent = (currentTime / totalDuration) * 100;

  return (
    <section className="min-h-screen noir-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
          data-testid="back-button"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Investigation
        </button>

        {/* Podcast Info Card */}
        <div className="glass rounded-3xl p-8 mb-8" data-testid="podcast-info">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover Art */}
            <div className="w-48 h-48 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Skull className="w-24 h-24 text-white/80" />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-2">
                <Radio className="w-4 h-4" />
                CODE INVESTIGATION
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" data-testid="podcast-title">
                {podcast?.title || "The Unknown Repository"}
              </h1>
              <p className="text-gray-400 mb-4">
                An investigation into <span className="text-white">{podcast?.repo_name || "Unknown Repository"}</span>
              </p>
              
              {/* Repo Stats */}
              {podcast?.repo_metadata && (
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {podcast.repo_metadata.stars?.toLocaleString() || 0} stars
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-4 h-4" />
                    {podcast.repo_metadata.forks?.toLocaleString() || 0} forks
                  </span>
                  <span className="flex items-center gap-1">
                    <Code className="w-4 h-4" />
                    {podcast.repo_metadata.language || "Unknown"}
                  </span>
                  <a 
                    href={podcast.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-red-400 hover:text-red-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on GitHub
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="audio-player rounded-2xl p-6 mb-8" data-testid="audio-player">
          {podcast?.audio_url && (
            <audio
              ref={audioRef}
              src={`${BACKEND_URL}${podcast.audio_url}`}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercent}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #dc2626 ${progressPercent}%, #374151 ${progressPercent}%)`
              }}
              data-testid="progress-slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => skipTime(-15)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              data-testid="skip-back-button"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 transition-all"
              data-testid="play-pause-button"
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </button>

            <button
              onClick={() => skipTime(15)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              data-testid="skip-forward-button"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="ml-4 flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-white"
                data-testid="mute-button"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume * 100}
                onChange={(e) => {
                  setVolume(e.target.value / 100);
                  if (audioRef.current) {
                    audioRef.current.volume = e.target.value / 100;
                  }
                }}
                className="w-20 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                data-testid="volume-slider"
              />
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="glass rounded-2xl p-6" data-testid="transcript-section">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            Transcript
          </h3>
          
          <div className="transcript-container space-y-3">
            {segments.map((segment, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  activeSegmentIndex === index
                    ? "segment-active bg-red-600/10"
                    : "bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => {
                  const time = segmentTimes[index]?.start || 0;
                  setCurrentTime(time);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                  }
                }}
                data-testid={`transcript-segment-${index}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    segment.speaker === "narrator" 
                      ? "bg-red-600/20 text-red-400"
                      : "bg-blue-600/20 text-blue-400"
                  }`}>
                    {segment.speaker === "narrator" ? "Narrator" : "Expert"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(segmentTimes[index]?.start || 0)}
                  </span>
                  {segment.sound_effect && (
                    <span className="text-xs text-purple-400">
                      [{segment.sound_effect}]
                    </span>
                  )}
                </div>
                <p className="text-gray-300">{segment.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Patterns Found */}
        {podcast?.patterns_found?.length > 0 && (
          <div className="glass rounded-2xl p-6 mt-8" data-testid="patterns-found">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Patterns Detected
            </h3>
            <div className="flex flex-wrap gap-2">
              {podcast.patterns_found.map((pattern, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-yellow-600/20 text-yellow-400 rounded-lg text-sm"
                >
                  {pattern.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Pattern Database Component
const PatternDatabase = ({ patterns, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = patterns?.categories || [];
  
  const filteredPatterns = (patterns?.patterns || []).filter(pattern => {
    const matchesSearch = pattern.pattern_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || pattern.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "text-red-400 bg-red-600/20";
      case "warning": return "text-yellow-400 bg-yellow-600/20";
      default: return "text-blue-400 bg-blue-600/20";
    }
  };

  return (
    <section className="min-h-screen noir-bg px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onClose}
          className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
          data-testid="pattern-back-button"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back
        </button>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4" data-testid="pattern-title">
            Pattern Database
          </h2>
          <p className="text-gray-400">
            Known code patterns and their dramatic narratives. 
            <span className="text-red-400"> {patterns?.total_occurrences || 0}</span> total detections.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-red-600/50"
              data-testid="pattern-search"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white"
            data-testid="pattern-category-filter"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Pattern Grid */}
        <div className="grid gap-4" data-testid="pattern-grid">
          {filteredPatterns.map((pattern, index) => (
            <div
              key={index}
              className={`glass rounded-xl p-6 severity-${pattern.severity}`}
              data-testid={`pattern-card-${index}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {pattern.pattern_name?.replace(/-/g, " ")}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(pattern.severity)}`}>
                      {pattern.severity?.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{pattern.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{pattern.occurrences || 0}</div>
                  <div className="text-xs text-gray-500">detections</div>
                </div>
              </div>

              {pattern.dramatic_narrative && (
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <p className="text-gray-400 text-sm italic mb-2">"{pattern.dramatic_narrative.setup}"</p>
                  <p className="text-red-400 text-sm italic mb-2">"{pattern.dramatic_narrative.climax}"</p>
                  <p className="text-green-400 text-sm italic">"{pattern.dramatic_narrative.resolution}"</p>
                </div>
              )}

              {pattern.solutions?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pattern.solutions.map((solution, i) => (
                    <span key={i} className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">
                      {solution}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredPatterns.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No patterns found matching your criteria.
          </div>
        )}
      </div>
    </section>
  );
};

// Stats Dashboard Component
const StatsDashboard = ({ stats }) => {
  return (
    <section className="py-20 px-4 noir-bg">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4" data-testid="stats-title">
            Investigation Statistics
          </h2>
          <p className="text-gray-400">
            Patterns detected across all analyzed repositories
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="stats-card glass rounded-2xl p-6 text-center" data-testid="stats-podcasts">
            <Radio className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <div className="text-4xl font-bold text-white mb-1">{stats?.total_podcasts || 0}</div>
            <div className="text-gray-400">Podcasts Generated</div>
          </div>

          <div className="stats-card glass rounded-2xl p-6 text-center" data-testid="stats-patterns">
            <Bug className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <div className="text-4xl font-bold text-white mb-1">{stats?.total_patterns || 0}</div>
            <div className="text-gray-400">Known Patterns</div>
          </div>

          <div className="stats-card glass rounded-2xl p-6 text-center" data-testid="stats-detections">
            <TrendingUp className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <div className="text-4xl font-bold text-white mb-1">
              {Object.values(stats?.category_breakdown || {}).reduce((a, b) => a + b, 0) || 0}
            </div>
            <div className="text-gray-400">Total Detections</div>
          </div>
        </div>

        {/* Category Breakdown */}
        {Object.keys(stats?.category_breakdown || {}).length > 0 && (
          <div className="glass rounded-2xl p-6" data-testid="category-breakdown">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Category Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.category_breakdown).map(([category, count]) => (
                <div key={category} className="bg-white/5 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">{count}</div>
                  <div className="text-sm text-gray-400">{category}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Podcasts */}
        {stats?.recent_podcasts?.length > 0 && (
          <div className="glass rounded-2xl p-6 mt-6" data-testid="recent-podcasts">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Recent Investigations
            </h3>
            <div className="space-y-3">
              {stats.recent_podcasts.map((podcast) => (
                <div 
                  key={podcast.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                >
                  <div>
                    <div className="text-white font-medium">{podcast.title || podcast.repo_name}</div>
                    <div className="text-sm text-gray-500">{podcast.repo_name}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(podcast.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Podcast List Component
const PodcastList = ({ podcasts, onSelect }) => {
  if (!podcasts?.length) return null;

  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6" data-testid="podcast-list-title">
          Recent Investigations
        </h2>
        <div className="grid gap-4">
          {podcasts.map((podcast) => (
            <button
              key={podcast.id}
              onClick={() => onSelect(podcast)}
              className="glass rounded-xl p-6 text-left hover:bg-white/10 transition-all group"
              data-testid={`podcast-item-${podcast.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                  <Skull className="w-8 h-8 text-white/80" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold group-hover:text-red-400 transition-colors">
                    {podcast.title || "Unknown Investigation"}
                  </h3>
                  <p className="text-gray-400 text-sm">{podcast.repo_name}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(podcast.duration / 60)}m
                    </span>
                    <span>{podcast.patterns_found?.length || 0} patterns</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-red-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// Main App Component
function App() {
  const [view, setView] = useState("home"); // home, analyzing, player, patterns
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [currentPodcast, setCurrentPodcast] = useState(null);
  const [podcasts, setPodcasts] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    fetchPodcasts();
    fetchPatterns();
    fetchStats();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const response = await axios.get(`${API}/podcasts`);
      setPodcasts(response.data.podcasts || []);
    } catch (err) {
      console.error("Error fetching podcasts:", err);
    }
  };

  const fetchPatterns = async () => {
    try {
      const response = await axios.get(`${API}/patterns`);
      setPatterns(response.data);
    } catch (err) {
      console.error("Error fetching patterns:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const pollAnalysisStatus = useCallback(async (podcastId) => {
    try {
      const response = await axios.get(`${API}/analyze/${podcastId}/status`);
      setAnalysisStatus(response.data);

      if (response.data.status === "completed") {
        // Stop polling and fetch the complete podcast
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        
        const podcastResponse = await axios.get(`${API}/podcasts/${podcastId}`);
        setCurrentPodcast(podcastResponse.data);
        setView("player");
        fetchPodcasts();
        fetchStats();
      } else if (response.data.status === "failed") {
        // Stop polling on failure
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setError(response.data.error || "Analysis failed");
      }
    } catch (err) {
      console.error("Error polling status:", err);
    }
  }, []);

  const handleAnalyze = async (repoUrl, style) => {
    try {
      setError(null);
      setView("analyzing");
      setAnalysisStatus({ status: "pending", progress: 0, message: "Starting investigation..." });

      const response = await axios.post(`${API}/analyze`, {
        repo_url: repoUrl,
        narrative_style: style
      });

      const podcastId = response.data.id;

      // Start polling for status
      pollIntervalRef.current = setInterval(() => {
        pollAnalysisStatus(podcastId);
      }, 2000);

      // Initial poll
      pollAnalysisStatus(podcastId);
    } catch (err) {
      console.error("Error starting analysis:", err);
      setError(err.response?.data?.detail || "Failed to start analysis");
      setView("home");
    }
  };

  const handleSelectPodcast = (podcast) => {
    setCurrentPodcast(podcast);
    setView("player");
  };

  const handleBack = () => {
    setView("home");
    setCurrentPodcast(null);
    setAnalysisStatus(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="App min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass" data-testid="main-nav">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-white hover:text-red-400 transition-colors"
            data-testid="nav-logo"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Repo-to-Podcast</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setView("patterns")}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
              data-testid="nav-patterns"
            >
              <Bug className="w-4 h-4" />
              Patterns
            </button>
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
              data-testid="nav-home"
            >
              <Search className="w-4 h-4" />
              Investigate
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {view === "home" && (
          <>
            <HeroSection 
              onAnalyze={handleAnalyze} 
              isAnalyzing={false}
            />
            {stats && <StatsDashboard stats={stats} />}
            <PodcastList podcasts={podcasts} onSelect={handleSelectPodcast} />
          </>
        )}

        {view === "analyzing" && (
          <AnalysisProgress 
            status={analysisStatus}
            onComplete={() => setView("player")}
          />
        )}

        {view === "player" && currentPodcast && (
          <PodcastPlayer 
            podcast={currentPodcast} 
            onBack={handleBack}
          />
        )}

        {view === "patterns" && (
          <PatternDatabase 
            patterns={patterns} 
            onClose={handleBack}
          />
        )}
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2" data-testid="error-toast">
          <XCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:text-red-200">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
