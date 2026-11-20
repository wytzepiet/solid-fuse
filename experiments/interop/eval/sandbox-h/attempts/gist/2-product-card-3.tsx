import { View, Text, Icon, Image } from "solid-fuse";
import { star } from "solid-fuse/icons/material";

export function ProductCard(props: {
  imageUrl: string;
  title: string;
  price: number;
  rating: number;
}) {
  return (
    <View
      width={180}
      // Clipping the card to its rounded decoration makes the image's top corners follow the rounding.
      clipBehavior="antiAlias"
      decoration={{
        color: "#FFFFFF",
        borderRadius: 16,
        // Soft shadow: blur only (no offset expressed, to stay within the known API).
        shadow: { color: "#00000026", blurRadius: 16 },
      }}
      flex={{ direction: "column" }}
    >
      <Image src={props.imageUrl} width={180} height={180} fit="cover" />
      <View padding={12} flex={{ direction: "column", gap: 8 }}>
        <Text fontSize={16} fontWeight={600} color="#111111" maxLines={2} overflow="ellipsis">
          {props.title}
        </Text>
        <View flex={{ direction: "row", align: "center" }}>
          <Text fontSize={15} fontWeight={700} color="#111111">
            {`$${props.price.toFixed(2)}`}
          </Text>
          <View grow={1} />
          <View flex={{ direction: "row", align: "center", gap: 2 }}>
            <Icon data={star} size={14} color="#F5A623" />
            <Text fontSize={13} color="#555555">
              {String(props.rating)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
