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
      clipBehavior="antiAlias"
      flex={{ direction: "column" }}
      decoration={{
        color: "#FFFFFF",
        borderRadius: 16,
        shadow: { color: "#00000029", blurRadius: 16 },
      }}
    >
      <Image src={props.imageUrl} width={180} height={180} fit="cover" />
      <View padding={12} flex={{ direction: "column", gap: 8 }}>
        <Text
          fontSize={16}
          fontWeight={600}
          color="#111111"
          maxLines={2}
          overflow="ellipsis"
        >
          {props.title}
        </Text>
        <View flex={{ direction: "row", align: "center", gap: 4 }}>
          <View grow={1}>
            <Text fontSize={15} fontWeight="bold" color="#111111">
              {`$${props.price.toFixed(2)}`}
            </Text>
          </View>
          <Icon data={star} size={14} color="#F5A623" />
          <Text fontSize={13} color="#555555">
            {props.rating.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );
}
