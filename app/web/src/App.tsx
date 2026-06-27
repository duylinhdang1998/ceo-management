import { useRoutes } from 'react-router-dom';
import { routes } from '@/pages/routes';
import { UploadProgressIndicator } from '@/features/reports/components/UploadProgressIndicator';

export default function App() {
  const element = useRoutes(routes);
  return (
    <>
      {element}
      {/* Global upload progress indicator — persists across route/modal changes */}
      <UploadProgressIndicator />
    </>
  );
}
