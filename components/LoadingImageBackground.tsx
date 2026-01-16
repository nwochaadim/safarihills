import { ComponentProps, useState } from 'react';
import { ImageBackground } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type LoadingImageBackgroundProps = ComponentProps<typeof ImageBackground> & {
  className?: string;
};

export function LoadingImageBackground({
  className,
  children,
  onLoadEnd,
  style,
  imageStyle,
  ...props
}: LoadingImageBackgroundProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View className={className} style={style}>
      <ImageBackground
        {...props}
        cachePolicy={props.cachePolicy ?? 'memory-disk'}
        style={StyleSheet.absoluteFillObject}
        imageStyle={imageStyle}
        onLoadEnd={() => {
          setIsLoading(false);
          onLoadEnd?.();
        }}>
        {isLoading ? (
          <View className="absolute inset-0 items-center justify-center bg-slate-200/40">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        ) : null}
        {children}
      </ImageBackground>
    </View>
  );
}
