export type Role = "student" | "admin";
export type Status = "pending" | "active" | "blocked";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: Role;
  status: Status;
  plan_id: string | null;
  created_at: string;
}

export interface AdminUser extends Profile {
  email: string;
  phone: string | null;
  last_sign_in_at: string | null;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  position: number;
  published: boolean;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  resources: string | null;
  duration_min: number | null;
  position: number;
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export interface Author {
  full_name: string;
  avatar_url: string | null;
  role: Role;
}

export interface Post {
  id: string;
  author_id: string;
  category: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author: Author | null;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Author | null;
}
