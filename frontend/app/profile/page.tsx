'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { userApi } from '@/lib/api';
import { AppNav } from '@/components/AppNav';
import { Profile, ProfileSkill } from '@/types';

const emptySkill = (): ProfileSkill => ({
  name: '',
  level: 'intermediate',
  category: 'General',
});

const labelClass = 'block text-sm font-semibold text-gray-900 mb-1';
const sectionLabelClass = 'block text-sm font-semibold text-gray-900 mb-2';
const subLabelClass = 'block text-xs font-medium text-gray-900 mb-1';
const fieldClass =
  'bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export default function ProfilePage() {
  const { user, loading: authLoading, refreshSession } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [radius, setRadius] = useState(25);
  const [skills, setSkills] = useState<ProfileSkill[]>([]);
  const [newSkill, setNewSkill] = useState<ProfileSkill>(emptySkill());
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('USA');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const profile = await userApi.getProfile();
        applyProfileToForm(profile, user.email);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load profile';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const applyProfileToForm = (profile: Profile | null, email: string) => {
    const defaultName = email.split('@')[0] ?? '';
    setDisplayName(profile?.displayName ?? defaultName);
    setBio(profile?.bio ?? '');
    setRadius(profile?.radius ?? 25);
    setSkills(profile?.skills ?? []);
    const coords = profile?.location?.coordinates ?? [0, 0];
    setLongitude(coords[0] === 0 ? '' : String(coords[0]));
    setLatitude(coords[1] === 0 ? '' : String(coords[1]));
    setCity(profile?.location?.address?.city ?? '');
    setState(profile?.location?.address?.state ?? '');
    setCountry(profile?.location?.address?.country ?? 'USA');
  };

  const handleAddSkill = () => {
    const name = newSkill.name.trim();
    if (!name) return;
    setSkills([
      ...skills,
      {
        name,
        level: newSkill.level ?? 'intermediate',
        category: newSkill.category.trim() || 'General',
      },
    ]);
    setNewSkill(emptySkill());
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (displayName.trim().length < 2) {
        throw new Error('Display name must be at least 2 characters');
      }

      const lng = parseFloat(longitude);
      const lat = parseFloat(latitude);
      if (Number.isNaN(lng) || Number.isNaN(lat)) {
        throw new Error('Enter valid longitude and latitude');
      }

      const updated = await userApi.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        radius,
        skills,
        location: {
          coordinates: [lng, lat],
          address: {
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            country: country.trim() || undefined,
          },
        },
      });

      applyProfileToForm(updated, user!.email);
      await refreshSession();
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { details?: { message: string }[]; message?: string } } } };
      const details = axiosErr.response?.data?.error?.details;
      if (details?.length) {
        setError(details.map((d) => d.message).join(' '));
      } else if (axiosErr.response?.data?.error?.message) {
        setError(axiosErr.response.data.error.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save profile');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600 mb-8">
          Update how others see you in the community. Changes are saved to your account.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <label htmlFor="displayName" className={labelClass}>
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              required
              className={`w-full px-4 py-2 ${fieldClass}`}
            />
          </div>

          <div>
            <label htmlFor="bio" className={labelClass}>
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Tell others about your skills and what you are looking for..."
              className={`w-full px-4 py-2 ${fieldClass}`}
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500</p>
          </div>

          <div>
            <label htmlFor="radius" className={labelClass}>
              Search radius (miles)
            </label>
            <input
              id="radius"
              type="number"
              min={1}
              max={100}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className={`w-full max-w-xs px-4 py-2 ${fieldClass}`}
            />
          </div>

          <div>
            <span className={sectionLabelClass}>Skills</span>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                placeholder="Skill name"
                className={`flex-1 px-4 py-2 ${fieldClass}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <select
                value={newSkill.level}
                onChange={(e) =>
                  setNewSkill({
                    ...newSkill,
                    level: e.target.value as ProfileSkill['level'],
                  })
                }
                className={`px-4 py-2 ${fieldClass}`}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {skills.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <li
                    key={`${skill.name}-${index}`}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center gap-2 text-sm"
                  >
                    {skill.name} ({skill.level})
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="text-blue-600 hover:text-blue-900 font-bold"
                      aria-label={`Remove ${skill.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No skills added yet.</p>
            )}
          </div>

          <div>
            <span className={sectionLabelClass}>Location</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="longitude" className={subLabelClass}>
                  Longitude
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-122.4194"
                  required
                  className={`w-full px-4 py-2 ${fieldClass}`}
                />
              </div>
              <div>
                <label htmlFor="latitude" className={subLabelClass}>
                  Latitude
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="37.7749"
                  required
                  className={`w-full px-4 py-2 ${fieldClass}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className={`px-4 py-2 ${fieldClass}`}
              />
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className={`px-4 py-2 ${fieldClass}`}
              />
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className={`px-4 py-2 ${fieldClass}`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </main>
    </div>
  );
}
