    import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { config } from '../config';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import defaultAvatar from '../assets/defaultAvatar.svg';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

interface UserData {
  id: number;
  username: string;
  email: string;
  rating: number;
  bio?: string;
  avatarUrl?: string;
}

export const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, updateProfile, uploadAvatar, isLoading, token, isAuthenticated, error, logout } = useAuthStore();
  const [profileUser, setProfileUser] = useState<UserData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('');
  const [avatarError, setAvatarError] = useState<string>('');

  const isOwnProfile = !userId || (currentUser && userId === String(currentUser.id));
  const displayUser = isOwnProfile ? currentUser : profileUser;

  useEffect(() => {
    if (isOwnProfile && currentUser && !isEditing) {
      // Viewing own profile
      setProfileUser(null);
      setUsername(currentUser.username);
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatarUrl || '');
    } else if (userId) {
      // Viewing another user's profile
      loadUserProfile(userId);
    }
  }, [userId, currentUser, isOwnProfile, isEditing]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const loadUserProfile = async (id: string) => {
    setLoadingProfile(true);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${config.apiUrl}/api/auth/users/${id}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setProfileUser(data);
        setUsername(data.username);
        setBio(data.bio || '');
        setAvatarUrl(data.avatarUrl || '');
      } else {
        console.error('Failed to load user profile');
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      navigate('/profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Guest trying to view their own profile (no userId and not authenticated)
  if (isOwnProfile && !isAuthenticated) {
    return (
      <div className="lobby-shell">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
          <div className="w-full max-w-2xl mx-auto card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)] text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Login Required</h2>
            <p className="text-white/70 mb-6">You need to login to view your profile.</p>
            <button
              onClick={() => navigate('/auth')}
              className="h-12 px-8 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-all"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!displayUser && !loadingProfile) {
    return null;
  }

  if (loadingProfile) {
    return (
      <div className="lobby-shell">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
          <div className="w-full max-w-2xl mx-auto card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <div className="text-center text-white/70">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!displayUser) return null;

  const handleSave = async () => {
    try {
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          setAvatarUrl(uploadedUrl);
        }
        setAvatarFile(null);
        setAvatarError('');
        if (avatarPreviewUrl) {
          URL.revokeObjectURL(avatarPreviewUrl);
          setAvatarPreviewUrl('');
        }
      }

      await updateProfile({ username, bio });
      setIsEditing(false);
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleCancel = () => {
    if (displayUser) {
      setUsername(displayUser.username);
      setBio(displayUser.bio || '');
      setAvatarUrl(displayUser.avatarUrl || '');
    }
    setAvatarFile(null);
    setAvatarError('');
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl('');
    }
    setIsEditing(false);
  };

  const effectiveAvatarUrl = avatarPreviewUrl || (avatarUrl?.trim() ? avatarUrl.trim() : defaultAvatar);

  const validateAndSetAvatarFile = async (file: File) => {
    setAvatarError('');

    const maxBytes = 200 * 1024;
    if (file.size > maxBytes) {
      setAvatarFile(null);
      setAvatarError('Max avatar size is 200KB');
      return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
      setAvatarFile(null);
      setAvatarError('Please upload a valid image file');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Invalid image'));
        img.src = objectUrl;
      });

      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setAvatarPreviewUrl(objectUrl);
      setAvatarFile(file);
      setAvatarError('');
    } catch {
      URL.revokeObjectURL(objectUrl);
      setAvatarFile(null);
      setAvatarError('Please upload a valid image file');
    }
  };

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
          <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <button
            type="button"
            className="sidebar-user"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
            aria-label={isAuthenticated ? "Open dashboard" : "Login"}
            style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
          >
            <div>
              <div className="sidebar-user-name">{isAuthenticated ? (currentUser?.username ?? 'User') : 'Login'}</div>
              <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
            </div>
          </button>
        </div>

        <div className="lobby-layout">
          <aside className="lobby-sidebar">
            <div className="lobby-sidebar-nav">
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconMagnifier className="nav-icon" />
                <span>Find Match</span>
              </button>
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconPlus className="nav-icon" />
                <span>Create Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=multiplayer', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconGlobe className="nav-icon" />
                <span>Online Multiplayer</span>
              </button>
              <button onClick={() => navigate('/local?mode=local', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconChessboard className="nav-icon" />
                <span>Local Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=bot', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconRobot className="nav-icon" />
                <span>Play vs Bot</span>
              </button>
              <button onClick={() => navigate('/puzzles')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">🧩</span>
                <span>Tactical Puzzles</span>
              </button>
              <button onClick={() => navigate('/tutorial')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">📚</span>
                <span>Tutorial</span>
              </button>
              <button onClick={() => navigate('/rules')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">📖</span>
                <span>Chess Rules</span>
              </button>
            </div>

            {isAuthenticated && (
              <div className="lobby-sidebar-footer">
                <button type="button" onClick={logout} className="btn-secondary sidebar-btn sidebar-btn--logout">
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>

          <main className="lobby-main">
        <div className="w-full max-w-2xl mx-auto card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">
          {isOwnProfile ? 'Profile' : `${displayUser.username}'s Profile`}
        </h2>
      </div>

      <div className="overflow-x-auto">
        {isOwnProfile && isEditing && error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm">
            {error}
          </div>
        )}
        <table className="w-full text-left border-separate border-spacing-0">
          <tbody className="divide-y divide-white/20">
            <tr>
              <th scope="row" className="w-36 py-4 pr-4 align-middle text-sm font-medium text-white/80">
                Avatar
              </th>
              <td className="py-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 max-w-20 max-h-20 aspect-square flex-none rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold"
                    style={{ width: 80, height: 80 }}
                  >
                    <img
                      src={effectiveAvatarUrl}
                      alt={username || displayUser.username}
                      className="block w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== defaultAvatar) {
                          img.src = defaultAvatar;
                        }
                      }}
                    />
                  </div>

                  {isEditing && isOwnProfile && (
                    <div className="flex-1 min-w-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) {
                            setAvatarFile(null);
                            setAvatarError('');
                            if (avatarPreviewUrl) {
                              URL.revokeObjectURL(avatarPreviewUrl);
                              setAvatarPreviewUrl('');
                            }
                            return;
                          }
                          void validateAndSetAvatarFile(file);
                        }}
                        className="w-full h-11 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[19px] text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white file:font-semibold hover:file:bg-white/15 focus:outline-none focus:border-purple-500 transition-colors"
                        aria-label="Upload avatar"
                      />
                      {avatarError && (
                        <p className="mt-2 text-sm text-red-300">{avatarError}</p>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>

            <tr>
              <th scope="row" className="w-36 py-4 pr-4 align-middle text-sm font-medium text-white/80">
                Username
              </th>
              <td className="py-4">
                {isEditing && isOwnProfile ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-[19px] text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                ) : (
                  <p className="text-white text-lg">{displayUser.username}</p>
                )}
              </td>
            </tr>

            {isOwnProfile && (
              <tr>
                <th scope="row" className="w-36 py-4 pr-4 align-middle text-sm font-medium text-white/80">
                  Email
                </th>
                <td className="py-4">
                  <p className="text-white text-lg break-all">{displayUser.email}</p>
                </td>
              </tr>
            )}

            <tr>
              <th scope="row" className="w-36 py-4 pr-4 align-middle text-sm font-medium text-white/80">
                Rating
              </th>
              <td className="py-4">
                <p className="text-white text-lg font-semibold">{displayUser.rating}</p>
              </td>
            </tr>

            <tr>
              <th scope="row" className="w-36 py-4 pr-4 align-middle text-sm font-medium text-white/80">
                Bio
              </th>
              <td className="py-4">
                {isEditing && isOwnProfile ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={5}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[19px] text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                ) : (
                  <p className="text-white/70 whitespace-pre-wrap">{displayUser.bio || 'No bio yet'}</p>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Action buttons */}
        {isOwnProfile && (
          <div className="flex space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary flex-1"
              >
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>
    </div>
          </main>
        </div>
      </div>
    </div>
  );
};
