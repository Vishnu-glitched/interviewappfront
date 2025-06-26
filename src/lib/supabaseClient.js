import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Supabase connected successfully');
  }
});

// User profile functions
export const createUserProfile = async (userId, username, email) => {
  try {
    console.log('Creating profile for:', userId, username, email);
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: userId,
          username: username,
          email: email
        }
      ])
      .select();

    if (error) {
      console.error('Profile creation error:', error);
      // If it's a duplicate key error, that's okay - profile already exists
      if (error.code === '23505') {
        console.log('Profile already exists');
        return null;
      }
      throw error;
    }
    console.log('Profile created:', data);
    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    console.log('Fetching profile for user:', userId);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      if (error.code === 'PGRST116') {
        // No profile found, return null
        console.log('No profile found for user');
        return null;
      }
      throw error;
    }
    console.log('Profile fetched:', data);
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    console.log('Updating profile for:', userId, updates);
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Profile update error:', error);
      throw error;
    }
    console.log('Profile updated:', data);
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Remove username availability check since usernames can now be duplicated
export const checkUsernameAvailability = async (username) => {
  // Always return true since usernames can be duplicated now
  console.log('Username check bypassed - duplicates allowed:', username);
  return true;
};

// Database functions
export const submitInterviewAnswer = async (answerData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('interview_responses')
      .insert([
        {
          user_id: user.id,
          question: answerData.question,
          answer_text: answerData.answer_text,
          structure_score: answerData.structure_score,
          clarity_score: answerData.clarity_score,
          tone_score: answerData.tone_score,
          issues: answerData.issues,
          suggestions: answerData.suggestions,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error submitting interview answer:', error);
    throw error;
  }
};

export const logChatMessage = async (message, response) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('chat_logs')
      .insert([
        {
          user_id: user.id,
          message: message,
          response: response,
          timestamp: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging chat message:', error);
    throw error;
  }
};

export const getUserInterviewHistory = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching interview history:', error);
    return [];
  }
};