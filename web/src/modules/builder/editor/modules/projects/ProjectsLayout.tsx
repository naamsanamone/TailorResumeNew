import { RichtextEditor } from '@/helpers/common/components/richtext';
import { useActivity } from '@/stores/activity';

const ProjectsLayout = () => {
  const activities = useActivity((state) => state.activities);
  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Add your key projects. Use bullet points for descriptions.
      </h4>
      <RichtextEditor
        label="Projects"
        value={activities.involvements}
        onChange={(htmlOutput) => {
          useActivity.getState().updateInvolvements(htmlOutput);
        }}
        name="projects"
      />
    </div>
  );
};

export default ProjectsLayout;
