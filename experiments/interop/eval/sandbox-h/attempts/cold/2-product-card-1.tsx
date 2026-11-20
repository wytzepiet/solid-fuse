import { View, Text, Image, Icon } from "solid-fuse";
import { star } from "solid-fuse/icons/material";

const CARD_WIDTH = 180;
const PADDING = 12;
const RADIUS = 16;

export function ProductCard(props: {
  imageUrl: string;
  title: string;
  price: number;
  rating: number;
}) {
  return (
    <View
      width={CARD_WIDTH}
      clipBehavior="antiAlias"
      decoration={{
        color: "white",
        borderRadius: RADIUS,
        shadow: [{ blurRadius: 12, color: "#00000026", offsetY: 4 }],
      }}
      flex={{ direction: "vertical" }}
    >
      <View
        width={CARD_WIDTH}
        height={CARD_WIDTH}
        clipBehavior="antiAlias"
        decoration={{
          color: "#EEEEEE",
          borderRadius: {
            topLeft: RADIUS,
            topRight: RADIUS,
            bottomLeft: 0,
            bottomRight: 0,
          },
        }}
      >
        <Image
          src={props.imageUrl}
          width={CARD_WIDTH}
          height={CARD_WIDTH}
          fit="cover"
        />
      </View>
      <View
        width={CARD_WIDTH}
        padding={PADDING}
        flex={{ direction: "vertical", gap: 8 }}
      >
        <View width={CARD_WIDTH - PADDING * 2}>
          <Text
            fontSize={16}
            fontWeight="semiBold"
            color="#1A1A1A"
            maxLines={2}
            overflow="ellipsis"
          >
            {props.title}
          </Text>
        </View>
        <View
          width={CARD_WIDTH - PADDING * 2}
          flex={{
            direction: "horizontal",
            justify: "spaceBetween",
            align: "center",
          }}
        >
          <Text fontSize={16} fontWeight="bold" color="#1A1A1A">
            {`$${props.price.toFixed(2)}`}
          </Text>
          <View flex={{ direction: "horizontal", gap: 2, align: "center" }}>
            <Icon data={star} size={16} color="amber" />
            <Text fontSize={13} color="#555555">
              {props.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
