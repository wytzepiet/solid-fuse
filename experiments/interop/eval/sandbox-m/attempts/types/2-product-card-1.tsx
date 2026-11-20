import { ClipRRect, Column, Container, Expanded, Icon, ImageNetwork, Padding, Row, SizedBox, Text } from "solid-fuse";
import { star } from "solid-fuse/icons/material";

export function ProductCard(props: { imageUrl: string; title: string; price: number; rating: number }) {
  return (
    <Container
      width={180}
      decoration={{
        $: "BoxDecoration",
        color: "white",
        borderRadius: 16,
        boxShadow: [{ color: "#00000026", blurRadius: 12, offset: { dx: 0, dy: 4 } }],
      }}
    >
      <Column mainAxisSize="min" crossAxisAlignment="stretch">
        <ClipRRect borderRadius={{ $: "vertical", top: 16 }}>
          <ImageNetwork src={props.imageUrl} width={180} height={180} fit="cover" />
        </ClipRRect>
        <Padding padding={12}>
          <Column mainAxisSize="min" crossAxisAlignment="stretch">
            <Text maxLines={2} overflow="ellipsis" style={{ fontSize: 16, fontWeight: "w600", color: "#222222" }}>
              {props.title}
            </Text>
            <SizedBox height={8} />
            <Row crossAxisAlignment="center">
              <Expanded>
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#111111" }}>
                  {`$${props.price.toFixed(2)}`}
                </Text>
              </Expanded>
              <Icon icon={star} size={16} color="amber" />
              <SizedBox width={2} />
              <Text style={{ fontSize: 13, color: "#555555" }}>{`${props.rating}`}</Text>
            </Row>
          </Column>
        </Padding>
      </Column>
    </Container>
  );
}
