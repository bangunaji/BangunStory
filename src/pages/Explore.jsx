import React, { useEffect, useState } from 'react';
import { BookOpen, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPublishedStories } from '../services/storyService';
import { useAuth } from '../context/AuthContext';

export default function Explore() {
  const { currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStories() {
      try {
        const pubStories = await getPublishedStories();
        setStories(pubStories);
      } catch (err) {
        console.error("Failed to load stories", err);
      } finally {
        setLoading(false);
      }
    }
    loadStories();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="text-center py-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl border border-white/50 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl -z-10"></div>
        <h1 className="text-5xl font-extrabold text-text mb-4">Discover Your Next Adventure</h1>
        <p className="text-xl text-text-light max-w-2xl mx-auto mb-8">
          Explore thousands of stories from creative minds around the world, or start writing your own with AI-powered assistance.
        </p>
        <Link to={currentUser ? "/dashboard" : "/signup"} className="inline-block bg-primary text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-primary-hover hover:scale-105 transition-all shadow-lg shadow-primary/30">
          Start Writing
        </Link>
      </section>

      <section>
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="text-secondary w-6 h-6" />
          <h2 className="text-2xl font-bold">Trending Now</h2>
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-text-light">Loading stories...</div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12 text-text-light bg-white/50 rounded-2xl border border-gray-100">
            No published stories found. Be the first to publish one!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Link key={story.id} to={`/story/${story.id}?authorId=${story.authorId}`} className="glass p-6 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-gray-100 group block">
                <div className="aspect-[3/4] bg-gray-200 rounded-xl mb-4 overflow-hidden relative">
                  {story.coverUrl && (
                    <img src={story.coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="bg-primary/90 text-xs font-bold px-2 py-1 rounded-md mb-2 inline-block">Story</span>
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{story.title || "Untitled"}</h3>
                <p className="text-sm text-text-light mb-3 line-clamp-2">{story.synopsis || "No synopsis available."}</p>
                <div className="flex items-center justify-between text-xs text-text-light">
                  <span className="flex items-center"><Star className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor"/> 4.8</span>
                  <span>{story.views || 0} reads</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
