-- Create table to track ignored tips per category
CREATE TABLE public.ignored_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  ignored_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT ignored_tips_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE public.ignored_tips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own ignored tips" 
ON public.ignored_tips 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ignored tips" 
ON public.ignored_tips 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ignored tips" 
ON public.ignored_tips 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_ignored_tips_user_category ON public.ignored_tips(user_id, category, ignored_until);