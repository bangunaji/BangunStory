import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, ChevronLeft, Save, Plus, Globe, CheckCircle, Menu, X, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStory, getScenes, createScene, updateScene, publishScene, publishStory, unpublishStory, updateStory, deleteScene } from '../services/storyService';
import { generateContinuation } from '../services/aiService';

export default function Workspace() {
  const { storyId } = useParams();
  const { currentUser } = useAuth();
  
  const [story, setStory] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(null);
  
  // Mobile Layout State
  const [showLeftMobile, setShowLeftMobile] = useState(false);
  const [showRightMobile, setShowRightMobile] = useState(false);
  
  // Form State
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [storySynopsis, setStorySynopsis] = useState("");
  const [storyCover, setStoryCover] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved"); // "Saved", "Saving...", "Unsaved"
  const [generating, setGenerating] = useState(false);
  const [aiQuestions, setAiQuestions] = useState([]);

  // Auto-save refs
  const typingTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!currentUser || !storyId) return;

    async function loadData() {
      const s = await getStory(currentUser.uid, storyId);
      setStory(s);
      if (s) {
        setStoryTitle(s.title || "");
        setStorySynopsis(s.synopsis || "");
        setStoryCover(s.coverUrl || "");
      }
      
      const sc = await getScenes(currentUser.uid, storyId);
      setScenes(sc);
      
      if (sc.length > 0) {
        isInitialLoadRef.current = true;
        setActiveSceneId(sc[0].id);
        setContent(sc[0].content || "");
        setTitle(sc[0].title || `Scene 1`);
        
        // Allow a small delay before auto-save activates to prevent saving immediate loads
        setTimeout(() => { isInitialLoadRef.current = false; }, 500);
      } else {
        isInitialLoadRef.current = false;
      }
      setLoading(false);
    }
    loadData();
  }, [currentUser, storyId]);

  // Auto-save logic
  useEffect(() => {
    if (isInitialLoadRef.current || !activeSceneId || loading) return;

    setSaveStatus("Unsaved");
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      performSave(activeSceneId, title, content);
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(typingTimeoutRef.current);
  }, [content, title, activeSceneId]);

  const performSave = async (sceneId, sceneTitle, sceneContent) => {
    setSaving(true);
    setSaveStatus("Saving...");
    try {
      await updateScene(currentUser.uid, storyId, sceneId, {
        title: sceneTitle,
        content: sceneContent
      });
      setSaveStatus("Saved");
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, title: sceneTitle, content: sceneContent } : s));
    } catch (err) {
      console.error("Auto-save failed", err);
      setSaveStatus("Error");
    } finally {
      setSaving(false);
    }
  };

  const handleStoryInfoChange = async (field, value) => {
    if (!storyId || !currentUser) return;
    try {
      await updateStory(currentUser.uid, storyId, { [field]: value });
    } catch (error) {
      console.error("Failed to update story info:", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
      if (!apiKey) {
        alert("ImgBB API Key is missing. Please add VITE_IMGBB_API_KEY to your .env file.");
        setIsUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        const imageUrl = data.data.url;
        setStoryCover(imageUrl);
        await handleStoryInfoChange('coverUrl', imageUrl);
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image: " + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleStoryInfoBlur = async () => {
    if (!story) return;
    try {
      await updateStory(currentUser.uid, storyId, {
        title: storyTitle,
        synopsis: storySynopsis,
        coverUrl: storyCover
      });
      setStory({ ...story, title: storyTitle, synopsis: storySynopsis, coverUrl: storyCover });
    } catch (err) {
      console.error("Failed to update story info", err);
    }
  };

  const handleSceneSwitch = (scene) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Save current before switching if unsaved
    if (saveStatus === "Unsaved") {
      performSave(activeSceneId, title, content);
    }

    isInitialLoadRef.current = true;
    setActiveSceneId(scene.id);
    setContent(scene.content || "");
    setTitle(scene.title || "");
    setAiQuestions([]);
    setSaveStatus("Saved");
    
    setTimeout(() => { isInitialLoadRef.current = false; }, 500);
  };

  const handleNewScene = async () => {
    if (!storyId || !currentUser) return;
    
    const newOrder = scenes.length > 0 ? Math.max(...scenes.map(s => s.order || 0)) + 1 : 1;
    
    try {
      const sceneId = await createScene(currentUser.uid, storyId, {
        title: `Scene ${newOrder}`,
        content: "",
        order: newOrder
      });
      
      const newScene = { id: sceneId, title: `Scene ${newOrder}`, content: "", order: newOrder, isPublished: false };
      setScenes([...scenes, newScene]);
      setActiveSceneId(sceneId);
      setTitle(`Scene ${newOrder}`);
      setContent("");
      if (window.innerWidth < 768) setShowLeftMobile(false);
    } catch (error) {
      console.error("Failed to create scene:", error);
    }
  };

  const handleDeleteScene = async (e, sceneToDelete) => {
    e.stopPropagation(); // prevent clicking the list item
    
    if (!window.confirm(`Are you sure you want to delete "${sceneToDelete.title || 'this scene'}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteScene(currentUser.uid, storyId, sceneToDelete.id);
      const updatedScenes = scenes.filter(s => s.id !== sceneToDelete.id);
      setScenes(updatedScenes);
      
      if (activeSceneId === sceneToDelete.id) {
        if (updatedScenes.length > 0) {
          handleSceneSwitch(updatedScenes[0]);
        } else {
          setActiveSceneId(null);
          setTitle("");
          setContent("");
        }
      }
    } catch (err) {
      console.error("Failed to delete scene:", err);
      alert("Failed to delete scene.");
    }
  };

  const handlePublishStory = async () => {
    if (!story) return;
    const isCurrentlyPublished = story.status === "published";
    try {
      if (isCurrentlyPublished) {
        await unpublishStory(currentUser.uid, storyId);
        setStory({ ...story, status: "draft" });
      } else {
        await publishStory(currentUser.uid, storyId);
        setStory({ ...story, status: "published" });
      }
    } catch (err) {
      console.error("Failed to toggle publish status", err);
    }
  };

  const handlePublishChapter = async () => {
    if (!activeSceneId) return;
    try {
      await publishScene(currentUser.uid, storyId, activeSceneId);
      setScenes(prev => prev.map(s => s.id === activeSceneId ? { ...s, isPublished: true } : s));
      alert("Chapter published successfully! Readers can now see it.");
    } catch (err) {
      console.error("Failed to publish chapter", err);
    }
  };

  const handleGenerate = async () => {
    if (!content) return;
    setGenerating(true);
    setAiQuestions([]);
    
    const words = content.split(" ");
    const lastParagraphs = words.slice(Math.max(words.length - 300, 0)).join(" ");
    
    const result = await generateContinuation({
      synopsis: story?.synopsis || "A creative story.",
      lastParagraphs,
      mode: "short"
    });
    
    setContent(prev => prev + (prev.endsWith(" ") || prev.endsWith("\n") ? "" : " ") + result);
    setGenerating(false);
  };

  const handleBrainstorm = async () => {
    setGenerating(true);
    const words = content.split(" ");
    const lastParagraphs = words.slice(Math.max(words.length - 300, 0)).join(" ");
    
    const result = await generateContinuation({
      synopsis: story?.synopsis || "A creative story.",
      lastParagraphs,
      mode: "brainstorm"
    });
    
    setAiQuestions(result.split('\n').filter(q => q.trim().length > 0));
    setGenerating(false);
  };

  if (loading) return <div className="p-8 text-center text-text-light">Loading workspace...</div>;

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-in fade-in duration-500 relative">
      
      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
        <button 
          onClick={() => { setShowLeftMobile(!showLeftMobile); setShowRightMobile(false); }}
          className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-gray-200 font-bold text-sm text-text flex items-center"
        >
          <Menu className="w-4 h-4 mr-2" /> {showLeftMobile ? 'Close' : 'Scenes'}
        </button>
        <button 
          onClick={() => { setShowRightMobile(!showRightMobile); setShowLeftMobile(false); }}
          className="bg-primary/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl border border-primary font-bold text-sm text-white flex items-center"
        >
          <Sparkles className="w-4 h-4 mr-2" /> {showRightMobile ? 'Close' : 'AI Tools'}
        </button>
      </div>

      {/* Mobile Overlay */}
      {(showLeftMobile || showRightMobile) && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => { setShowLeftMobile(false); setShowRightMobile(false); }}
        />
      )}

      {/* Left Sidebar - Navigation */}
      <div className={`w-72 glass rounded-2xl p-4 flex-col border border-gray-100 shadow-xl md:shadow-none fixed md:relative z-40 inset-y-4 left-4 md:inset-auto md:w-64 transition-transform duration-300 ${showLeftMobile ? 'translate-x-0 flex' : '-translate-x-[150%] md:translate-x-0 hidden md:flex'}`}>
        <Link to="/dashboard" className="flex items-center text-text-light hover:text-text text-sm font-semibold mb-6 shrink-0">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1 flex flex-col custom-scrollbar">
          <div className="mb-6 shrink-0 space-y-3">
          <input 
            type="text" 
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            onBlur={handleStoryInfoBlur}
            placeholder="Story Title"
            className="w-full font-bold text-lg bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary outline-none transition-colors px-1"
          />
          <textarea 
            value={storySynopsis}
            onChange={(e) => setStorySynopsis(e.target.value)}
            onBlur={handleStoryInfoBlur}
            placeholder="Write a short synopsis..."
            className="w-full text-xs text-text-light bg-transparent resize-none h-20 border border-transparent hover:border-gray-200 focus:border-primary rounded-lg outline-none transition-colors p-1"
          />
          <div className="mb-6">
            <label className="block text-sm font-bold text-text-light mb-2">Cover Image</label>
            {storyCover ? (
              <div className="relative rounded-xl overflow-hidden shadow-sm group">
                <img src={storyCover} alt="Cover Preview" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition-colors">
                    <ImagePlus className="w-5 h-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:bg-gray-50 hover:border-primary transition-colors cursor-pointer relative">
                {isUploadingImage ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-xs font-semibold text-gray-500">Upload Cover Image</span>
                  </>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={isUploadingImage} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="font-bold text-lg">Scenes</h3>
          <button onClick={handleNewScene} className="text-primary hover:bg-primary/10 p-1 rounded transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <ul className="space-y-2 pb-4">
          {scenes.length === 0 && <li className="text-sm text-text-light p-2">No scenes yet.</li>}
          {scenes.map((scene, idx) => (
            <li 
              key={scene.id}
              className={`flex items-center justify-between text-sm w-full p-3 rounded-xl transition-all cursor-pointer group ${activeSceneId === scene.id ? 'bg-white shadow-sm border border-gray-100 font-bold text-primary' : 'text-text-light hover:bg-white/50 hover:text-text border border-transparent'}`}
              onClick={() => { handleSceneSwitch(scene); setShowLeftMobile(false); }}
            >  
              <div className="flex items-center flex-1 truncate">
                <span className="truncate">{idx + 1}. {scene.title || `Scene ${idx + 1}`}</span>
                {scene.isPublished && <Globe className="w-3 h-3 text-green-500 flex-shrink-0 ml-2" title="Published" />}
              </div>
              <button 
                onClick={(e) => handleDeleteScene(e, scene)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded transition-all ml-2 flex-shrink-0"
                title="Delete Scene"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        </div>

        {/* Global Story Publish Toggle */}
        <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
          <button 
            onClick={handlePublishStory}
            className={`w-full py-2 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 ${story?.status === 'published' ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-red-100 hover:text-red-800 hover:border-red-200' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'}`}
          >
            <Globe className="w-4 h-4" />
            <span>{story?.status === 'published' ? 'Unpublish Story' : 'Publish Story'}</span>
          </button>
          <p className="text-[10px] text-text-light text-center mt-2 leading-tight">
            {story?.status === 'published' ? 'This story is visible in Explore.' : 'Publish to make this story visible to readers.'}
          </p>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 glass rounded-2xl p-6 border border-gray-100 flex flex-col shadow-sm">
        {activeSceneId ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <input 
                type="text" 
                className="text-2xl font-bold bg-transparent outline-none w-full flex-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Scene Title"
              />
              
              <div className="flex items-center space-x-3 ml-4 shrink-0">
                <span className={`text-xs font-medium flex items-center ${saveStatus === 'Saved' ? 'text-green-600' : 'text-text-light'}`}>
                  {saveStatus === 'Saved' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {saveStatus}
                </span>

                <button 
                  onClick={handlePublishChapter}
                  disabled={scenes.find(s => s.id === activeSceneId)?.isPublished}
                  className="bg-white border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:bg-gray-50 disabled:border-gray-100 flex items-center"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  {scenes.find(s => s.id === activeSceneId)?.isPublished ? 'Published' : 'Publish Chapter'}
                </button>
              </div>
            </div>
            
            <textarea 
              className="flex-1 w-full bg-transparent resize-none outline-none text-lg leading-relaxed text-text font-serif"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your story here..."
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-light">
            <p className="mb-4">Select or create a scene to start writing.</p>
            <button onClick={handleNewScene} className="bg-primary text-white px-4 py-2 rounded-full font-bold text-sm shadow-md">
              Create First Scene
            </button>
          </div>
        )}
      </div>

      {/* Right Sidebar - AI Assistant */}
      <div className={`w-80 glass rounded-2xl p-5 border border-gray-100 flex-col shadow-xl md:shadow-sm overflow-y-auto fixed md:relative z-40 inset-y-4 right-4 md:inset-auto transition-transform duration-300 ${showRightMobile ? 'translate-x-0 flex' : 'translate-x-[150%] md:translate-x-0 hidden lg:flex'}`}>
        <div className="flex items-center space-x-2 mb-6">
          <Sparkles className="w-5 h-5 text-secondary" />
          <h3 className="font-bold text-lg">AI Assistant</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-xl border border-primary/10">
            <h4 className="font-semibold text-sm mb-2 text-text">Writer's Block?</h4>
            <p className="text-xs text-text-light mb-3">Let the AI generate the next few paragraphs based on your style and synopsis.</p>
            <button 
              onClick={handleGenerate}
              disabled={generating || !activeSceneId}
              className="w-full bg-white border border-gray-200 text-sm font-bold py-2 rounded-lg hover:border-primary hover:text-primary transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? 'Thinking...' : 'Generate Continuation'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <h4 className="font-semibold text-sm mb-2 text-text">Need Ideas?</h4>
            <button 
              onClick={handleBrainstorm}
              disabled={generating || !activeSceneId}
              className="w-full bg-white border border-gray-200 text-sm font-bold py-2 rounded-lg hover:border-secondary hover:text-secondary transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Brainstorm Questions</span>
            </button>
          </div>

          {aiQuestions.length > 0 && (
            <div className="mt-4 p-4 bg-secondary/10 rounded-xl border border-secondary/20 animate-in fade-in">
              <h4 className="font-bold text-sm mb-2 text-secondary">Brainstorming Ideas:</h4>
              <ul className="space-y-2 text-sm text-text-light">
                {aiQuestions.map((q, idx) => (
                  <li key={idx} className="leading-relaxed border-b border-secondary/10 pb-2 last:border-0">{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
