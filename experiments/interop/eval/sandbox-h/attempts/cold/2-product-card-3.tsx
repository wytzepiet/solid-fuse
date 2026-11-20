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
      decoration={{
        color: "white",
        borderRadius: 16,
        shadow: [{ blurRadius: 12, color: "#00000026", offsetY: 4 }],
      }}
    >
      <View
        width={180}
        height={180}
        clipBehavior="antiAlias"
        decoration={{
          borderRadius: { topLeft: 16, topRight: 16, bottomLeft: 0, bottomRight: 0 },
        }}
      >
        <Image src={props.imageUrl} width={180} height={180} fit="cover" />
      </View>
      <View width={180} padding={12} flex={{ direction: "vertical", gap: 8 }}>
        <Text
          fontSize={16}
          fontWeight="semiBold"
          color="#222222"
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
          <Text fontSize={15} fontWeight="bold" color="#111111">
            {"$" + props.price.toFixed(2)}
          </Text>
          <View flex={{ direction: "horizontal", gap: 2, align: "center" }}>
            <Icon data={star} size={16} color="amber" />
            <Text fontSize={13} color="#555555">
              {String(props.rating)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
