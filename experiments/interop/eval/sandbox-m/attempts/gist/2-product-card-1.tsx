import { Column, Container, Icon, ImageNetwork, Padding, Row, SizedBox, Text } from "solid-fuse";
import { star } from "solid-fuse/icons/material";

export function ProductCard(props: { imageUrl: string; title: string; price: number; rating: number }) {
  return (
    <Container
      width={180}
      clipBehavior="antiAlias"
      decoration={{
        $: "BoxDecoration",
        color: "white",
        borderRadius: 16,
        boxShadow: [{ color: "#00000026", blurRadius: 16, offset: { dx: 0, dy: 4 } }],
      }}
    >
      <Column mainAxisSize="min" crossAxisAlignment="start">
        <ImageNetwork src={props.imageUrl} width={180} height={180} fit="cover" />
        <Padding padding={12}>
          <Column mainAxisSize="min" crossAxisAlignment="start">
            <Text maxLines={2} overflow="ellipsis" style={{ fontSize: 16, fontWeight: "w600" }}>
              {props.title}
            </Text>
            <SizedBox height={8} />
            <Row mainAxisAlignment="spaceBetween">
              <Text style={{ fontWeight: "bold" }}>{`$${props.price.toFixed(2)}`}</Text>
              <Row mainAxisSize="min">
                <Icon icon={star} size={16} color="amber" />
                <SizedBox width={4} />
                <Text>{`${props.rating}`}</Text>
              </Row>
            </Row>
          </Column>
        </Padding>
      </Column>
    </Container>
  );
}
