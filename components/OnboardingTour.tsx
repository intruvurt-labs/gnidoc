// somewhere like app root
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

export default function Root() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem('onboarding_completed');
      setShowTour(!done);
    })();
  }, []);

  return (
    <>
      {/* ...rest of app */}
      <OnboardingTour
        visible={showTour}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
        onStepChange={(i, step) => {
          // e.g. highlight areas in your UI by step.highlight
        }}
        persistProgress
      />
    </>
  );
}
