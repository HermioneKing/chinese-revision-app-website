'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  name: string | null;
}

interface Post {
  id: number;
  title: string;
  content: string | null;
  authorId: number;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostAuthor, setNewPostAuthor] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data));

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/posts`)
      .then((res) => res.json())
      .then((data) => setPosts(data));
  }, []);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUserName, email: newUserEmail }),
    });
    const newUser = await res.json();
    setUsers([...users, newUser]);
    setNewUserName('');
    setNewUserEmail('');
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newPostTitle,
        content: newPostContent,
        authorId: Number(newPostAuthor),
      }),
    });
    const newPost = await res.json();
    setPosts([...posts, newPost]);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostAuthor('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center gap-8 py-16 px-8 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Users and Posts
        </h1>

        <div className="w-full">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Users
          </h2>
          <ul className="mt-4 space-y-2">
            {users.map((user) => (
              <li key={user.id} className="text-zinc-600 dark:text-zinc-400">
                {user.name} ({user.email})
              </li>
            ))}
          </ul>

          <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
            <h3 className="text-xl font-semibold text-black dark:text-zinc-50">
              Create User
            </h3>
            <input
              type="text"
              placeholder="Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <input
              type="email"
              placeholder="Email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-50 dark:text-black"
            >
              Create
            </button>
          </form>
        </div>

        <div className="w-full">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Posts
          </h2>
          <ul className="mt-4 space-y-2">
            {posts.map((post) => (
              <li key={post.id} className="text-zinc-600 dark:text-zinc-400">
                <h4 className="font-semibold">{post.title}</h4>
                <p>{post.content}</p>
              </li>
            ))}
          </ul>

          <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
            <h3 className="text-xl font-semibold text-black dark:text-zinc-50">
              Create Post
            </h3>
            <input
              type="text"
              placeholder="Title"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <textarea
              placeholder="Content"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <select
              value={newPostAuthor}
              onChange={(e) => setNewPostAuthor(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">Select Author</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-50 dark:text-black"
            >
              Create
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
