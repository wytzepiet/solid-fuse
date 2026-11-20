import { ClipRRect, Column, Container, Icon, ImageNetwork, Padding, Row, SizedBox, Text } from "solid-fuse";
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
      <ClipRRect borderRadius={16}>
        <Column mainAxisSize="min" crossAxisAlignment="start">
          <ImageNetwork src={props.imageUrl} width={180} height={180} fit="cover" />
          <Padding padding={12}>
            <Column mainAxisSize="min" crossAxisAlignment="start">
              <Text maxLines={2} overflow="ellipsis" style={{ fontSize: 16, fontWeight: "w600", color: "#222222" }}>
                {props.title}
              </Text>
              <SizedBox height={8} />
              <Row mainAxisAlignment="spaceBetween" crossAxisAlignment="center">
                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#222222" }}>
                  {`$${props.price.toFixed(2)}`}
                </Text>
                <Row mainAxisSize="min" crossAxisAlignment="center">
                  <Icon icon={star} size={16} color="amber" />
                  <SizedBox width={4} />
                  <Text style={{ fontSize: 13, color: "#555555" }}>{`${props.rating}`}</Text>
                </Row>
              </Row>
            </Column>
          </Padding>
        </Column>
      </ClipRRect>
    </Container>
  );
}
