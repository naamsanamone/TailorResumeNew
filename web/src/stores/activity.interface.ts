export interface IActivity {
  involvements: string;
  achievements: string;
  achievementsHtml: string;
}

export interface IActivityStore {
  activities: IActivity;
  reset: (activityItem: IActivity) => void;
  get: () => void;
  updateInvolvements: (involvements: string) => void;
  updateAchievements: (achievements: string) => void;
  updateAchievementsHtml: (achievementsHtml: string) => void;
}
