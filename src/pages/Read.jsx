import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle, Send, UserCircle } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getStory, getScene, getPublishedScenes, getSceneComments, addComment, incrementStoryViews } from '../services/storyService';
import { useAuth } from '../context/AuthContext';

export default function Read() {
  const { storyId, sceneId } = useParams();
  const [searchParams] = useSearchParams();
  const authorId = searchParams.get('authorId');

  const { currentUser } = useAuth();
  const [story, setStory] = useState(null);
  const [scene, setScene] = useState(null);
  const [allScenes, setAllScenes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Comments state
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authorId || !storyId || !sceneId) return;

    async function loadData() {
      try {
        const s = await getStory(authorId, storyId);
        setStory(s);
        
        // Increment views in background
        incrementStoryViews(authorId, storyId).catch(console.error);
        
        const sc = await getScene(authorId, storyId, sceneId);
        setScene(sc);

        const published = await getPublishedScenes(authorId, storyId);
        setAllScenes(published);
      } catch (err) {
        console.error("Failed to load reading data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [authorId, storyId, sceneId]);

  useEffect(() => {
    if (!showComments || !authorId || !storyId || !sceneId) return;
    async function loadComments() {
      const comms = await getSceneComments(authorId, storyId, sceneId);
      setComments(comms);
    }
    loadComments();
  }, [showComments, authorId, storyId, sceneId]);

  if (loading) return <div className="p-12 text-center text-text-light">Loading chapter...</div>;
  if (!scene || !scene.isPublished) return <div className="p-12 text-center text-red-500">Chapter not found or not published.</div>;

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      // In a real app we'd fetch the user's actual username from Firestore if it's missing
      const username = currentUser.displayName || currentUser.email.split('@')[0];
      await addComment(authorId, storyId, sceneId, currentUser.uid, username, newComment);
      setNewComment("");
      const comms = await getSceneComments(authorId, storyId, sceneId);
      setComments(comms);
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Find next/prev chapters
  const currentIndex = allScenes.findIndex(s => s.id === sceneId);
  const prevScene = currentIndex > 0 ? allScenes[currentIndex - 1] : null;
  const nextScene = currentIndex < allScenes.length - 1 ? allScenes[currentIndex + 1] : null;

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-700">
      <div className="mb-8 flex items-center justify-between">
        <Link to={`/story/${storyId}?authorId=${authorId}`} className="flex items-center text-text-light hover:text-text font-semibold text-sm transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Details
        </Link>
        <span className="text-sm font-semibold text-text-light">{story?.title || "Untitled Story"}</span>
      </div>

      <div className="glass rounded-3xl p-6 sm:p-12 border border-white/50 shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-12 text-text font-serif">
          {scene.title || `Chapter ${currentIndex + 1}`}
        </h1>
        
        {scene.audioUrl && (
          <div className="mb-12 flex justify-center">
            <audio controls src={scene.audioUrl} className="w-full max-w-md outline-none rounded-full shadow-sm bg-gray-50" />
          </div>
        )}

        <div className="prose prose-lg max-w-none text-text font-serif leading-loose space-y-6 whitespace-pre-wrap">
          {scene.content || "This chapter is empty."}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-center">
          {prevScene ? (
            <Link to={`/read/${storyId}/${prevScene.id}?authorId=${authorId}`} className="flex items-center text-text hover:text-primary font-semibold transition-colors">
              <ChevronLeft className="w-5 h-5 mr-1" /> Previous
            </Link>
          ) : (
            <button className="flex items-center text-text-light font-semibold opacity-50 cursor-not-allowed" disabled>
              <ChevronLeft className="w-5 h-5 mr-1" /> Previous
            </button>
          )}
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center px-4 py-2 rounded-full font-bold transition-colors ${showComments ? 'bg-primary text-white' : 'text-primary bg-primary/10 hover:bg-primary/20'}`}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Comments {comments.length > 0 && `(${comments.length})`}
          </button>

          {nextScene ? (
            <Link to={`/read/${storyId}/${nextScene.id}?authorId=${authorId}`} className="flex items-center text-text hover:text-primary font-semibold transition-colors">
              Next <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          ) : (
            <button className="flex items-center text-text-light font-semibold opacity-50 cursor-not-allowed" disabled>
              Next <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          )}
        </div>

        {showComments && (
          <div className="mt-8 pt-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
            <h3 className="font-bold text-xl mb-6 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-primary" /> Comments
            </h3>

            {currentUser ? (
              <form onSubmit={handleCommentSubmit} className="mb-8 relative">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this chapter..."
                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-12 resize-none h-24 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                  disabled={submitting}
                />
                <button 
                  type="submit" 
                  disabled={!newComment.trim() || submitting}
                  className="absolute bottom-4 right-4 text-primary bg-primary/10 p-2 rounded-full hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center mb-8 border border-gray-100">
                <p className="text-sm text-text-light mb-3">You must be logged in to leave a comment.</p>
                <Link to="/login" className="inline-block bg-primary text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm">Login</Link>
              </div>
            )}

            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-center text-text-light text-sm italic">No comments yet. Be the first to share your thoughts!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex space-x-3">
                    <UserCircle className="w-10 h-10 text-gray-300 flex-shrink-0" />
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm text-text">{comment.username}</span>
                        <span className="text-xs text-text-light">
                          {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-sm text-text-light leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
