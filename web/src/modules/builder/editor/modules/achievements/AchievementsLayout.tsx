import { RichtextEditor } from '@/helpers/common/components/richtext';
import { useActivity } from '@/stores/activity';

const AchievementsLayout = () => {
  const activities = useActivity((state) => state.activities);
  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Add your achievements, honors, and recognitions.
      </h4>
      <RichtextEditor
        label="Achievements"
        value={activities.achievementsHtml}
        onChange={(htmlOutput) => {
          useActivity.getState().updateAchievementsHtml(htmlOutput);
        }}
        name="achievementsHtml"
      />
    </div>
  );
};

export default AchievementsLayout;
