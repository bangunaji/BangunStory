import React, { useEffect, useState } from 'react';
import { Plus, Edit3, Book } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserStories, createStory } from '../services/storyService';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    async function loadStories() {
      try {
        const userStories = await getUserStories(currentUser.uid);
        setStories(userStories);
      } catch (error) {
        console.error("Error loading stories:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStories();
  }, [currentUser, navigate]);

  const handleNewStory = async () => {
    if (!currentUser) return;
    try {
      const storyId = await createStory(currentUser.uid, {
        title: "Untitled Story",
        synopsis: "",
      });
      navigate(`/workspace/${storyId}`);
    } catch (error) {
      console.error("Error creating story:", error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-light">Loading your stories...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-text">Writer Dashboard</h1>
          <p className="text-text-light mt-1">Manage your stories and ideas</p>
        </div>
        <button 
          onClick={handleNewStory}
          className="bg-primary text-white px-6 py-2.5 rounded-full font-bold hover:bg-primary-hover transition-all flex items-center space-x-2 shadow-md shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          <span>New Story</span>
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center border border-white/50">
          <Book className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No stories yet</h3>
          <p className="text-text-light">Click 'New Story' to start your first adventure!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map(story => (
            <div key={story.id} className="glass p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all relative group">
              <div className="absolute top-4 right-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${story.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {story.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                <Book className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2 line-clamp-1">{story.title}</h3>
              <p className="text-sm text-text-light mb-4 line-clamp-2">{story.synopsis || "No synopsis provided."}</p>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <div className="text-xs text-text-light">
                  {story.updatedAt?.toDate ? new Date(story.updatedAt.toDate()).toLocaleDateString() : 'Just now'}
                </div>
                <Link to={`/workspace/${story.id}`} className="text-primary font-semibold text-sm flex items-center hover:underline">
                  <Edit3 className="w-4 h-4 mr-1" /> Continue
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
