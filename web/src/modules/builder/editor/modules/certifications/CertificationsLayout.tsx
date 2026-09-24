import { RichtextEditor } from '@/helpers/common/components/richtext';
import { useActivity } from '@/stores/activity';

const CertificationsLayout = () => {
  const activities = useActivity((state) => state.activities);
  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Add your certifications, licenses, and courses.
      </h4>
      <RichtextEditor
        label="Certifications"
        value={activities.achievements}
        onChange={(htmlOutput) => {
          useActivity.getState().updateAchievements(htmlOutput);
        }}
        name="certifications"
      />
    </div>
  );
};

export default CertificationsLayout;
