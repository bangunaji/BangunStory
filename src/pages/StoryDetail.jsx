import React, { useEffect, useState } from 'react';
import { Play, Heart, Share2, BookOpen, X } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getStory, getPublishedScenes, getUserProfile, checkUserLiked, toggleStoryLike } from '../services/storyService';
import { useAuth } from '../context/AuthContext';

export default function StoryDetail() {
  const { storyId } = useParams();
  const [searchParams] = useSearchParams();
  const authorId = searchParams.get('authorId');
  
  const { currentUser } = useAuth();
  const [story, setStory] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(true);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [togglingLike, setTogglingLike] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    if (!authorId || !storyId) return;

    async function loadData() {
      try {
        const s = await getStory(authorId, storyId);
        setStory(s);
        setLikeCount(s?.likes || 0);
        
        if (currentUser) {
          const liked = await checkUserLiked(authorId, storyId, currentUser.uid);
          setIsLiked(liked);
        }

        const sc = await getPublishedScenes(authorId, storyId);
        setScenes(sc);
        const profile = await getUserProfile(authorId);
        if (profile) setAuthorName(profile.username);
      } catch (err) {
        console.error("Failed to load story details", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [authorId, storyId]);

  if (loading) return <div className="p-8 text-center text-text-light">Loading story...</div>;
  if (!story) return <div className="p-8 text-center text-text-light">Story not found.</div>;

  const handleLikeToggle = async () => {
    if (!currentUser) return; // Prompt login if not logged in
    if (togglingLike) return;
    
    setTogglingLike(true);
    try {
      const nowLiked = await toggleStoryLike(authorId, storyId, currentUser.uid);
      setIsLiked(nowLiked);
      setLikeCount(prev => nowLiked ? prev + 1 : Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to toggle like", err);
    } finally {
      setTogglingLike(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
          <div 
            className="w-48 h-72 bg-gray-200 rounded-2xl flex-shrink-0 shadow-lg relative overflow-hidden cursor-pointer group"
            onClick={() => story.coverUrl && setIsImageModalOpen(true)}
          >
            {story.coverUrl ? (
              <>
                <img src={story.coverUrl} alt="Cover" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">View Full</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold mb-2 text-text">{story.title || "Untitled"}</h1>
            <p className="text-lg text-text-light mb-4">By {authorName || `Author ID: ${authorId.substring(0,6)}...`}</p>
            
            <div className="flex space-x-4 mb-6">
              <button 
                onClick={handleLikeToggle}
                disabled={togglingLike || !currentUser}
                className={`flex items-center text-sm font-semibold transition-colors ${isLiked ? 'text-primary' : 'text-text hover:text-primary'} ${!currentUser && 'opacity-50 cursor-not-allowed'}`}
                title={!currentUser ? "Login to like" : ""}
              >
                <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-primary text-primary' : 'text-primary'}`} /> 
                {likeCount} Likes
              </button>
              <span className="flex items-center text-sm font-semibold text-text"><BookOpen className="w-4 h-4 mr-1 text-secondary" /> {story.views || 0} Reads</span>
            </div>
            
            <h3 className="font-bold text-lg mb-2">Synopsis</h3>
            <p className="text-text-light leading-relaxed mb-8">
              {story.synopsis || "No synopsis available."}
            </p>
            
            <div className="flex gap-4">
              {scenes.length > 0 ? (
                <Link to={`/read/${storyId}/${scenes[0].id}?authorId=${authorId}`} className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30 flex items-center space-x-2">
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Reading</span>
                </Link>
              ) : (
                <button disabled className="bg-gray-300 text-gray-500 px-8 py-3 rounded-full font-bold cursor-not-allowed">
                  No Chapters Published
                </button>
              )}
              <button className="bg-white border border-gray-200 px-4 py-3 rounded-full font-bold hover:bg-gray-50 transition-colors flex items-center space-x-2">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 sm:p-8 border border-white/50 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">Chapters ({scenes.length})</h2>
        {scenes.length === 0 ? (
          <p className="text-text-light">No published chapters yet.</p>
        ) : (
          <ul className="space-y-3">
            {scenes.map((scene, idx) => (
              <li key={scene.id}>
                <Link to={`/read/${storyId}/${scene.id}?authorId=${authorId}`} className="flex justify-between items-center p-4 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-gray-100 group">
                  <span className="font-semibold text-text group-hover:text-primary transition-colors">
                    Chapter {idx + 1}: {scene.title || "Untitled"}
                  </span>
                  <span className="text-sm text-text-light">
                    {scene.publishedAt?.toDate ? new Date(scene.publishedAt.toDate()).toLocaleDateString() : 'Recently'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Image Modal */}
      {isImageModalOpen && story.coverUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
            onClick={() => setIsImageModalOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={story.coverUrl} 
            alt="Full Cover" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
