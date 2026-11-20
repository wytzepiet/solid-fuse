import { Icon, Image, Text, View } from "solid-fuse";
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
        shadow: [{ blurRadius: 12, color: "#0000001F", offsetY: 4 }],
      }}
    >
      <Image
        src={props.imageUrl}
        width={180}
        height={180}
        fit="cover"
        borderRadius={{ topLeft: 16, topRight: 16 }}
      />
      <View width={180} padding={12} flex={{ gap: 8 }}>
        <Text
          fontSize={16}
          fontWeight="semiBold"
          color="#1A1A1A"
          maxLines={2}
          overflow="ellipsis"
        >
          {props.title}
        </Text>
        <View
          width={156}
          flex={{ direction: "horizontal", align: "center", justify: "spaceBetween" }}
        >
          <Text fontSize={15} fontWeight="bold" color="#1A1A1A">
            {`$${props.price.toFixed(2)}`}
          </Text>
          <View flex={{ direction: "horizontal", align: "center", gap: 2 }}>
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
