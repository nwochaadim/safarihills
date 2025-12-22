import { ComponentProps, useState } from 'react';
import { ActivityIndicator, ImageBackground, View } from 'react-native';

type LoadingImageBackgroundProps = ComponentProps<typeof ImageBackground> & {
  className?: string;
};

export function LoadingImageBackground({
  className,
  children,
  onLoadEnd,
  ...props
}: LoadingImageBackgroundProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <ImageBackground
      {...props}
      className={className}
      onLoadEnd={(event) => {
        setIsLoading(false);
        onLoadEnd?.(event);
      }}>
      {isLoading ? (
        <View className="absolute inset-0 items-center justify-center bg-slate-200/40">
          <ActivityIndicator color="#1d4ed8" />
        </View>
      ) : null}
      {children}
    </ImageBackground>
  );
}
