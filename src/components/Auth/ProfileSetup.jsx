// src/components/Auth/ProfileSetup.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

export default function ProfileSetup() {
  const { user, userProfile, setUserProfile } = useAuth();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Hey there! I am using ChatApp");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Pre-fill existing profile data when editing
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.displayName || "");
      setStatus(userProfile.status || "Hey there! I am using ChatApp");
      setPreview(userProfile.photoURL || null);
    }
  }, [userProfile]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image too large (max 5MB)");
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter your name");
    setLoading(true);
    try {
      let photoURL = userProfile?.photoURL || null;

      if (photo) {
        try {
          const storageRef = ref(storage, `avatars/${user.uid}`);
          await uploadBytes(storageRef, photo);
          photoURL = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.error("Photo upload failed:", uploadErr);
          toast.error("Photo upload failed, saving without photo");
        }
      }

      const profile = {
        uid: user.uid,
        displayName: name.trim(),
        status: status.trim(),
        photoURL,
        email: user.email || auth.currentUser?.email || null,
        phoneNumber: user.phoneNumber || auth.currentUser?.phoneNumber || null,
        updatedAt: serverTimestamp(),
        online: true,
      };

      // Keep createdAt if already exists
      if (!userProfile?.createdAt) {
        profile.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, "users", user.uid), profile, { merge: true });
      setUserProfile({ ...userProfile, ...profile });
      toast.success(userProfile ? "Profile updated! ✅" : "Profile saved! Welcome 🎉");
      navigate("/");
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <h1 className="auth-title">
          {userProfile ? "Edit Profile" : "Set Up Profile"}
        </h1>
        <p className="auth-subtitle">
          {userProfile ? "Update your profile info" : "Tell others who you are"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="avatar-upload">
            <label htmlFor="photo-input">
              <div className="avatar-preview">
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : "👤"}
              </div>
            </label>
            <label htmlFor="photo-input" style={{ cursor: "pointer" }}>
              📷 {preview ? "Change Photo" : "Upload Photo"}
            </label>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhoto}
            />
          </div>

          <div className="field">
            <label>Your Name *</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Status</label>
            <input
              type="text"
              placeholder="What's on your mind?"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={100}
            />
          </div>

          <button type="submit" className="btn" disabled={loading || !name.trim()}>
            {loading ? <span className="spinner" /> : userProfile ? "Save Changes →" : "Continue →"}
          </button>

          {userProfile && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => navigate("/")}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
}


