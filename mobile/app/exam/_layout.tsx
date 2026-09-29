import { Stack } from 'expo-router';

// Every screen under app/exam/ renders its own header via <AppLayout> (see
// components/AppLayout.tsx — logo, title, drawer menu). Without this, the
// root Stack's default native header still shows on top of it, titled with
// the raw file-route pattern (e.g. "exam/my-marks/[examId]") instead of a
// real title — a double header with an ugly, unsubstituted param name.
export default function ExamLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
