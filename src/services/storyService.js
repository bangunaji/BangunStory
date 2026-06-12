import { db } from '../firebase/config';
import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, addDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, collectionGroup, increment 
} from 'firebase/firestore';

// STORIES

export async function createStory(userId, data) {
  const newStoryRef = doc(collection(db, `users/${userId}/stories`));
  const storyData = {
    ...data,
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    authorId: userId,
  };
  await setDoc(newStoryRef, storyData);
  return newStoryRef.id;
}

export async function getUserStories(userId) {
  const storiesRef = collection(db, `users/${userId}/stories`);
  const q = query(storiesRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getStory(userId, storyId) {
  const storyRef = doc(db, `users/${userId}/stories/${storyId}`);
  const snapshot = await getDoc(storyRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
}

export async function updateStory(userId, storyId, data) {
  const storyRef = doc(db, `users/${userId}/stories/${storyId}`);
  await updateDoc(storyRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function publishStory(userId, storyId) {
  const storyRef = doc(db, `users/${userId}/stories/${storyId}`);
  await updateDoc(storyRef, {
    status: "published",
    updatedAt: serverTimestamp()
  });
}

export async function unpublishStory(userId, storyId) {
  const storyRef = doc(db, `users/${userId}/stories/${storyId}`);
  await updateDoc(storyRef, {
    status: "draft",
    updatedAt: serverTimestamp()
  });
}

// SCENES

export async function createScene(userId, storyId, data) {
  const newSceneRef = doc(collection(db, `users/${userId}/stories/${storyId}/scenes`));
  const sceneData = {
    ...data,
    status: "draft",
    isPublished: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(newSceneRef, sceneData);
  return newSceneRef.id;
}

export async function getScenes(userId, storyId) {
  const scenesRef = collection(db, `users/${userId}/stories/${storyId}/scenes`);
  const q = query(scenesRef, orderBy("order", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getUserProfile(userId) {
  const userRef = doc(db, 'users', userId);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return snapshot.data();
  }
  return null;
}

export async function getPublishedScenes(userId, storyId) {
  const scenesRef = collection(db, `users/${userId}/stories/${storyId}/scenes`);
  // Remove orderBy to prevent Composite Index error, sort in JS instead
  const q = query(scenesRef, where("isPublished", "==", true));
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return docs.sort((a, b) => a.order - b.order);
}

export async function updateScene(userId, storyId, sceneId, data) {
  const sceneRef = doc(db, `users/${userId}/stories/${storyId}/scenes/${sceneId}`);
  await updateDoc(sceneRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function publishScene(userId, storyId, sceneId) {
  const sceneRef = doc(db, `users/${userId}/stories/${storyId}/scenes/${sceneId}`);
  await updateDoc(sceneRef, {
    isPublished: true,
    status: "final",
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function getScene(userId, storyId, sceneId) {
  const sceneRef = doc(db, `users/${userId}/stories/${storyId}/scenes/${sceneId}`);
  const snapshot = await getDoc(sceneRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
}

export async function deleteScene(userId, storyId, sceneId) {
  const sceneRef = doc(db, `users/${userId}/stories/${storyId}/scenes/${sceneId}`);
  await deleteDoc(sceneRef);
}

// READER MODE - EXPLORE

export async function getPublishedStories() {
  const storiesQuery = query(
    collectionGroup(db, 'stories'), 
    where('status', '==', 'published')
  );
  
  const snapshot = await getDocs(storiesQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// COMMENTS
export async function addComment(authorId, storyId, sceneId, userId, username, text) {
  const commentsRef = collection(db, `users/${authorId}/stories/${storyId}/scenes/${sceneId}/comments`);
  await addDoc(commentsRef, {
    userId,
    username,
    text,
    createdAt: serverTimestamp()
  });
}

export async function getSceneComments(authorId, storyId, sceneId) {
  const commentsRef = collection(db, `users/${authorId}/stories/${storyId}/scenes/${sceneId}/comments`);
  const q = query(commentsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// LIKES & VIEWS
export async function incrementStoryViews(authorId, storyId) {
  const storyRef = doc(db, `users/${authorId}/stories/${storyId}`);
  await updateDoc(storyRef, {
    views: increment(1)
  });
}

export async function checkUserLiked(authorId, storyId, userId) {
  if (!userId) return false;
  const likeRef = doc(db, `users/${authorId}/stories/${storyId}/likes/${userId}`);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

export async function toggleStoryLike(authorId, storyId, userId) {
  if (!userId) return false;
  const storyRef = doc(db, `users/${authorId}/stories/${storyId}`);
  const likeRef = doc(db, `users/${authorId}/stories/${storyId}/likes/${userId}`);
  
  const snap = await getDoc(likeRef);
  if (snap.exists()) {
    // User already liked, so unlike
    await deleteDoc(likeRef);
    await updateDoc(storyRef, { likes: increment(-1) });
    return false; // currently not liked
  } else {
    // User hasn't liked, so like
    await setDoc(likeRef, { createdAt: serverTimestamp() });
    await updateDoc(storyRef, { likes: increment(1) });
    return true; // currently liked
  }
}
