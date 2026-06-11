import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const PROFILE_KEY = ['profile'];
const ENDPOINT = '/.netlify/functions/profile';

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => {
      const { data } = await axios.get(ENDPOINT);
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates) => {
      const { data } = await axios.put(ENDPOINT, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_KEY, data);
    },
  });
}
