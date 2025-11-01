import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  rating: number;
  editable?: boolean;
  size?: number;
  onChange?: (rating: number) => void;
  color?: string;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  editable = false,
  size = 24,
  onChange,
  color = '#FFD700', // Gold color
}) => {
  const handlePress = (starIndex: number) => {
    if (editable && onChange) {
      onChange(starIndex + 1);
    }
  };

  const renderStar = (index: number) => {
    const isFilled = index < rating;
    const StarComponent = editable ? TouchableOpacity : View;

    return (
      <StarComponent
        key={index}
        onPress={() => handlePress(index)}
        style={styles.starContainer}
        activeOpacity={0.7}
        accessibilityRole={editable ? 'button' : 'none'}
        accessibilityLabel={editable ? `Rate ${index + 1} star${index + 1 > 1 ? 's' : ''}` : undefined}
      >
        <Ionicons
          name={isFilled ? 'star' : 'star-outline'}
          size={size}
          color={isFilled ? color : '#D3D3D3'}
        />
      </StarComponent>
    );
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map(renderStar)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    marginHorizontal: 2,
  },
});

export default RatingStars;
