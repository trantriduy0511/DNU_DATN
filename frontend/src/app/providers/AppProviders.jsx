import UiFeedbackHost from '../../components/UiFeedbackHost';

export default function AppProviders({ children }) {
  return (
    <>
      {children}
      <UiFeedbackHost />
    </>
  );
}
