import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import resumeData from '@/helpers/constants/resume-data.json';
import { IActivityStore, IActivity } from './activity.interface';
import { SetState } from './store.interface';

const setAllAwards = (set: SetState<IActivityStore>) => (activityItem: IActivity) => {
  set({
    activities: {
      ...activityItem,
      achievementsHtml: activityItem.achievementsHtml || '',
    },
  });
};

const updateAchievements = (set: SetState<IActivityStore>) => (achievements: string) => {
  set(
    produce((state: IActivityStore) => {
      state.activities.achievements = achievements;
    })
  );
};

const updateInvolvements = (set: SetState<IActivityStore>) => (involvements: string) => {
  set(
    produce((state: IActivityStore) => {
      state.activities.involvements = involvements;
    })
  );
};

const updateAchievementsHtml = (set: SetState<IActivityStore>) => (achievementsHtml: string) => {
  set(
    produce((state: IActivityStore) => {
      state.activities.achievementsHtml = achievementsHtml;
    })
  );
};

export const useActivity = create<IActivityStore>()(
  persist(
    (set, get) => ({
      activities: {
        ...resumeData.activities,
        achievementsHtml: (resumeData.activities as any).achievementsHtml || '',
      },

      get: () => get().activities,
      reset: setAllAwards(set),
      updateAchievements: updateAchievements(set),
      updateInvolvements: updateInvolvements(set),
      updateAchievementsHtml: updateAchievementsHtml(set),
    }),
    { name: 'activities' }
  )
);
