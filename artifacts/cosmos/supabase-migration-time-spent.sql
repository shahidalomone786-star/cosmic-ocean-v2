-- Migration: add time_spent_seconds column to profiles table
-- Run this in the Supabase SQL editor for your project.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS time_spent_seconds integer NOT NULL DEFAULT 0;
