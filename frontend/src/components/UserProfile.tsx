    import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export const UserProfile: React.FC = () => {
  const { user, updateProfile, logout, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    try {
      await updateProfile({ username, bio, avatarUrl });
      setIsEditing(false);
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleCancel = () => {
    setUsername(user.username);
    setBio(user.bio || '');
    setAvatarUrl(user.avatarUrl || '');
    setIsEditing(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-slate-800 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Profile</h2>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
          {isEditing && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Avatar URL</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
          {isEditing ? (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          ) : (
            <p className="text-white text-lg">{user.username}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <p className="text-white text-lg">{user.email}</p>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Rating</label>
          <p className="text-white text-lg font-semibold">{user.rating}</p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
          {isEditing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          ) : (
            <p className="text-gray-300">{user.bio || 'No bio yet'}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex space-x-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 py-2 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
