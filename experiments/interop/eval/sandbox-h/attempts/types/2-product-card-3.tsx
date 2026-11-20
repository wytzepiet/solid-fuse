import { Icon, Image, Text, View } from "solid-fuse";
import { star } from "solid-fuse/icons/material";

const CARD_WIDTH = 180;
const CARD_RADIUS = 16;

export function ProductCard(props: {
  imageUrl: string;
  title: string;
  price: number;
  rating: number;
}) {
  return (
    <View
      width={CARD_WIDTH}
      flex={{ direction: "vertical", align: "stretch" }}
      decoration={{
        color: "white",
        borderRadius: CARD_RADIUS,
        shadow: [{ blurRadius: 16, color: "#00000022", offsetY: 4 }],
      }}
    >
      <Image
        src={props.imageUrl}
        width={CARD_WIDTH}
        height={CARD_WIDTH}
        fit="cover"
        borderRadius={{ topLeft: CARD_RADIUS, topRight: CARD_RADIUS }}
      />
      <View padding={12} flex={{ direction: "vertical", gap: 8, align: "stretch" }}>
        <Text
          fontSize={16}
          fontWeight="semiBold"
          color="#1F1F1F"
          maxLines={2}
          overflow="ellipsis"
        >
          {props.title}
        </Text>
        <View
          flex={{
            direction: "horizontal",
            align: "center",
            justify: "spaceBetween",
          }}
        >
          <Text fontSize={16} fontWeight="bold" color="#1F1F1F">
            {`$${props.price.toFixed(2)}`}
          </Text>
          <View flex={{ direction: "horizontal", gap: 2, align: "center" }}>
            <Icon data={star} size={16} color="amber" />
            <Text fontSize={13} color="#616161">
              {String(props.rating)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
