import { ComponentProps, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

type LoadingImageProps = ComponentProps<typeof Image> & {
  className?: string;
};

export function LoadingImage({ className, style, onLoadEnd, ...props }: LoadingImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View className={`overflow-hidden ${className ?? ''}`} style={style}>
      <Image
        {...props}
        style={[StyleSheet.absoluteFillObject, StyleSheet.flatten(style)]}
        onLoadEnd={(event) => {
          setIsLoading(false);
          onLoadEnd?.(event);
        }}
      />
      {isLoading ? (
        <View className="absolute inset-0 items-center justify-center bg-slate-200/40">
          <ActivityIndicator color="#1d4ed8" size="small" />
        </View>
      ) : null}
    </View>
  );
}
