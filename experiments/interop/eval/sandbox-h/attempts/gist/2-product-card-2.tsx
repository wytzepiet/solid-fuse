import { View, Text, Icon, Image } from "solid-fuse";
import { star } from "solid-fuse/icons/material";

const CARD_WIDTH = 180;
const PADDING = 12;
const INNER_WIDTH = CARD_WIDTH - PADDING * 2;

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
        color: "#FFFFFF",
        borderRadius: 16,
        shadow: { color: "#00000026", blurRadius: 16, offset: { dx: 0, dy: 6 } },
      }}
      flex={{ direction: "column" }}
    >
      <Image src={props.imageUrl} width={CARD_WIDTH} height={CARD_WIDTH} fit="cover" />
      <View width={CARD_WIDTH} padding={PADDING} flex={{ direction: "column", gap: 8 }}>
        <View width={INNER_WIDTH}>
          <Text fontSize={16} fontWeight="w600" color="#1A1A1A" maxLines={2} overflow="ellipsis">
            {props.title}
          </Text>
        </View>
        <View width={INNER_WIDTH} flex={{ direction: "row", align: "center" }}>
          <View grow={1}>
            <Text fontSize={15} fontWeight="bold" color="#1A1A1A">
              {`$${props.price.toFixed(2)}`}
            </Text>
          </View>
          <View flex={{ direction: "row", align: "center", gap: 2 }}>
            <Icon data={star} size={14} color="#F5A623" />
            <Text fontSize={13} color="#555555">
              {props.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
