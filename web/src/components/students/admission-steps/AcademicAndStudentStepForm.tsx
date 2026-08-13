import { AcademicStepForm } from './AcademicStepForm';
import { StudentStepForm } from './StudentStepForm';

export const AcademicAndStudentStepForm = () => {
  return (
    <div className="space-y-8">
      <StudentStepForm />
      <AcademicStepForm />
    </div>
  );
};
