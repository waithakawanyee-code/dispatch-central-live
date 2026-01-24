-- Add is_call_out boolean to distinguish between "marked off" and actual "call outs"
ALTER TABLE public.call_outs 
ADD COLUMN is_call_out boolean NOT NULL DEFAULT false;