import { Feather } from '@expo/vector-icons';
import { Animated, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';

import { ExploreSection } from '@/lib/explore';

export type ExploreWizardStep = 'welcome' | 'expand' | 'openCard';

export type WizardFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ExploreSectionsWizardProps = {
  visible: boolean;
  step: ExploreWizardStep;
  sections: ExploreSection[];
  discoverFrame: WizardFrame | null;
  toggleFrame: WizardFrame | null;
  cardsFrame: WizardFrame | null;
  onBack: () => void;
  onDoNotShowAgain: () => void;
  onSkip: () => void;
  onNext: () => void;
};

const STEP_ORDER: ExploreWizardStep[] = ['welcome', 'expand', 'openCard'];
const PANEL_MIN_HEIGHT = 286;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatSectionLabel = (value: string | undefined) => {
  if (!value?.trim()) return null;

  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bapartments?\b/i, 'Apartments');
};

export function ExploreSectionsWizard({
  visible,
  step,
  sections,
  discoverFrame,
  toggleFrame,
  cardsFrame,
  onBack,
  onDoNotShowAgain,
  onSkip,
  onNext,
}: ExploreSectionsWizardProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (!visible) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      pulse.setValue(0);
    };
  }, [pulse, visible]);

  const currentStepIndex = STEP_ORDER.indexOf(step);
  const primarySection = formatSectionLabel(sections[0]?.title) ?? 'Trending Apartments';
  const secondarySection = formatSectionLabel(sections[1]?.title) ?? 'Top Picks';
  const extraSections = Array.from(
    new Set([
      primarySection,
      secondarySection,
      ...sections
        .slice(0, 4)
        .map((section) => formatSectionLabel(section.title))
        .filter((value): value is string => Boolean(value)),
    ])
  ).slice(0, 4);

  const focusFrame = useMemo(() => {
    if (step === 'expand') return toggleFrame;
    if (step === 'openCard') return cardsFrame ?? discoverFrame;
    return discoverFrame;
  }, [cardsFrame, discoverFrame, step, toggleFrame]);

  const focusStyle = useMemo(() => {
    if (!focusFrame) return null;

    const padding = step === 'expand' ? 10 : 14;
    const left = clamp(focusFrame.x - padding, 14, Math.max(width - 14, 14));
    const top = clamp(focusFrame.y - padding, 24, Math.max(height - 24, 24));
    const maxWidth = Math.max(width - left - 14, 0);
    const maxHeight = Math.max(height - top - 24, 0);

    return {
      left,
      top,
      width: Math.min(focusFrame.width + padding * 2, maxWidth),
      height: Math.min(focusFrame.height + padding * 2, maxHeight),
    };
  }, [focusFrame, height, step, width]);

  const badgeStyle = useMemo(() => {
    if (!focusStyle || step === 'welcome') return null;

    const badgeWidth = step === 'expand' ? 154 : 136;
    const left = clamp(
      focusStyle.left + focusStyle.width / 2 - badgeWidth / 2,
      18,
      Math.max(width - badgeWidth - 18, 18)
    );
    const preferredTop = focusStyle.top - 54;
    const top = preferredTop < 52 ? focusStyle.top + focusStyle.height + 14 : preferredTop;

    return { left, top, width: badgeWidth };
  }, [focusStyle, step, width]);

  const panelSpacing = focusStyle
    ? Math.max(height - (focusStyle.top + focusStyle.height) - PANEL_MIN_HEIGHT - 36, 20)
    : 28;

  const panelPaddingBottom = clamp(panelSpacing, 20, 74);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.45, 0.2],
  });

  const headline =
    step === 'welcome'
      ? 'A quicker way to explore'
      : step === 'expand'
        ? 'Open the discover shelf'
        : 'Pick a section and dive in';

  const body =
    step === 'welcome'
      ? `Explore groups stays into curated collections like ${primarySection} and ${secondarySection}, so you can jump straight into the vibe you want.`
      : step === 'expand'
        ? 'This arrow reveals the section shelf beside Filters. It is the fastest way to browse curated apartment collections from the home screen.'
        : `Each card opens a full list. Start with ${primarySection}, hop into ${secondarySection}, or swipe across the rest when you want a different mood.`;

  const primaryActionLabel =
    step === 'welcome' ? 'Show me how' : step === 'expand' ? 'Expand discover' : 'Start exploring';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onSkip}>
      <View className="flex-1 bg-slate-950/80">
        <View className="absolute -left-16 top-24 h-44 w-44 rounded-full bg-amber-300/20" />
        <View className="absolute right-[-32px] top-40 h-52 w-52 rounded-full bg-sky-400/18" />
        <View className="absolute bottom-32 left-12 h-36 w-36 rounded-full bg-cyan-300/14" />

        {focusStyle ? (
          <>
            <Animated.View
              pointerEvents="none"
              className="absolute rounded-[28px] border border-amber-200"
              style={[
                focusStyle,
                {
                  opacity: haloOpacity,
                  transform: [{ scale: haloScale }],
                },
              ]}
            />
            <View
              pointerEvents="none"
              className="absolute rounded-[28px] border border-amber-200/90 bg-white/5"
              style={focusStyle}
            />
          </>
        ) : null}

        {badgeStyle ? (
          <View
            pointerEvents="none"
            className="absolute flex-row items-center gap-2 rounded-full border border-white/20 bg-slate-900/92 px-4 py-2"
            style={badgeStyle}>
            <View className="h-7 w-7 items-center justify-center rounded-full bg-amber-300/20">
              <Feather
                name={step === 'expand' ? 'chevrons-down' : 'layers'}
                size={14}
                color="#fcd34d"
              />
            </View>
            <Text className="text-xs font-semibold text-white">
              {step === 'expand' ? 'Discover toggle' : 'Section cards'}
            </Text>
          </View>
        ) : null}

        <View className="flex-1 justify-end px-5 pt-10" style={{ paddingBottom: panelPaddingBottom }}>
          <View className="overflow-hidden rounded-[32px] border border-white/20 bg-white px-5 pb-5 pt-4 shadow-2xl shadow-slate-950">
            <View className="flex-row items-center justify-between">
              <View className="rounded-full bg-slate-900 px-3 py-1.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                  Step {currentStepIndex + 1} of {STEP_ORDER.length}
                </Text>
              </View>
              <Pressable
                className="rounded-full border border-slate-200 px-3 py-2"
                onPress={onSkip}>
                <Text className="text-xs font-semibold text-slate-500">Skip</Text>
              </Pressable>
            </View>

            <View className="mt-4 flex-row gap-2">
              {STEP_ORDER.map((item, index) => (
                <View
                  key={item}
                  className={`h-1.5 flex-1 rounded-full ${
                    index <= currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </View>

            <View className="mt-5 flex-row items-start gap-3">
              <View className="mt-0.5 h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
                <Feather
                  name={step === 'welcome' ? 'compass' : step === 'expand' ? 'maximize-2' : 'arrow-right-circle'}
                  size={20}
                  color="#ffffff"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Explore guide
                </Text>
                <Text className="mt-2 text-[28px] font-bold leading-8 text-slate-950">
                  {headline}
                </Text>
                <Text className="mt-3 text-[15px] leading-6 text-slate-600">{body}</Text>
              </View>
            </View>

            {step === 'welcome' ? (
              <View className="mt-5 rounded-[28px] bg-slate-950 px-4 py-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  What you will see
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2.5">
                  {extraSections.map((label, index) => (
                    <View
                      key={`${label}-${index}`}
                      className={`rounded-full px-3 py-2 ${
                        index === 0
                          ? 'bg-amber-300/20'
                          : index === 1
                            ? 'bg-sky-400/20'
                            : 'bg-white/10'
                      }`}>
                      <Text
                        className={`text-sm font-semibold ${
                          index === 0
                            ? 'text-amber-200'
                            : index === 1
                              ? 'text-sky-200'
                              : 'text-white'
                        }`}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="mt-4 text-sm leading-6 text-slate-300">
                  The shelf stays close to the top of Explore, so you can always reopen it when you
                  want a faster starting point.
                </Text>
              </View>
            ) : null}

            {step === 'expand' ? (
              <View className="mt-5 rounded-[28px] border border-blue-100 bg-blue-50 px-4 py-4">
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <Feather name="chevrons-down" size={18} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-900">
                      Tap the chevron beside Filters
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-slate-600">
                      Once it opens, you will see the curated cards for trending stays, top picks,
                      and the rest of the section lineup.
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {step === 'openCard' ? (
              <View className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Then pick a card
                </Text>
                <View className="mt-3 flex-row gap-3">
                  {extraSections.slice(0, 2).map((label, index) => (
                    <View
                      key={label}
                      className={`flex-1 rounded-[24px] px-3 py-3 ${
                        index === 0 ? 'bg-slate-900' : 'bg-white'
                      }`}>
                      <Text
                        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          index === 0 ? 'text-slate-400' : 'text-slate-400'
                        }`}>
                        {index === 0 ? 'Try first' : 'Also great'}
                      </Text>
                      <Text
                        className={`mt-2 text-sm font-bold leading-5 ${
                          index === 0 ? 'text-white' : 'text-slate-900'
                        }`}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="mt-4 text-sm leading-6 text-slate-600">
                  The app leaves the shelf open after this guide, so you can tap any card right
                  away.
                </Text>
              </View>
            ) : null}

            <Pressable
              className="mt-6 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3.5"
              onPress={onDoNotShowAgain}>
              <Text className="text-sm font-semibold text-slate-600">Do not show again</Text>
            </Pressable>

            <View className="mt-3 flex-row items-center gap-3">
              {step !== 'welcome' ? (
                <Pressable
                  className="flex-1 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3.5"
                  onPress={onBack}>
                  <Text className="text-sm font-semibold text-slate-600">Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                className="flex-1 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3.5"
                onPress={onNext}>
                <Text className="text-base font-semibold text-white">{primaryActionLabel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
