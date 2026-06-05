import { createFileRoute } from '@tanstack/react-router';
import { AdminPageHeader } from './admin';
import { AnalysisForm } from '@/components/admin/AnalysisForm';

export const Route = createFileRoute('/admin/analyses/new')({ component: NewAnalysis });
function NewAnalysis() { return <><AdminPageHeader title="Nova Análise" /><AnalysisForm /></>; }
