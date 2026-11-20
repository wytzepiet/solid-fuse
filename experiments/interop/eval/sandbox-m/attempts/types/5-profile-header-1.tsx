import { Column, Row, Expanded, SizedBox, Stack, Positioned, Center, Container, ClipOval, ImageNetwork, Text } from "solid-fuse";

export interface ProfileHeaderProps {
  bannerUrl: string;
  avatarUrl: string;
  name: string;
  handle: string;
  posts: number;
  followers: number;
  following: number;
}

const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 96;
const RING_WIDTH = 4;
const AVATAR_OUTER = AVATAR_SIZE + RING_WIDTH * 2;

function Stat(props: { value: number; label: string }) {
  return (
    <Expanded>
      <Column mainAxisSize="min" crossAxisAlignment="center">
        <Text style={{ fontSize: 18, fontWeight: "bold" }} textAlign="center">
          {props.value}
        </Text>
        <SizedBox height={2} />
        <Text style={{ fontSize: 12, color: "#9E9E9E" }} textAlign="center">
          {props.label}
        </Text>
      </Column>
    </Expanded>
  );
}

export function ProfileHeader(props: ProfileHeaderProps) {
  return (
    <Column mainAxisSize="min" crossAxisAlignment="stretch">
      {/* Banner plus the half of the avatar that hangs below it. */}
      <SizedBox height={BANNER_HEIGHT + AVATAR_OUTER / 2}>
        <Stack>
          <Positioned top={0} left={0} right={0} height={BANNER_HEIGHT}>
            <ImageNetwork src={props.bannerUrl} height={BANNER_HEIGHT} fit="cover" />
          </Positioned>
          <Positioned top={BANNER_HEIGHT - AVATAR_OUTER / 2} left={0} right={0} height={AVATAR_OUTER}>
            <Center>
              <Container
                width={AVATAR_OUTER}
                height={AVATAR_OUTER}
                padding={RING_WIDTH}
                decoration={{ $: "BoxDecoration", color: "white", shape: "circle" }}
              >
                <ClipOval>
                  <ImageNetwork src={props.avatarUrl} width={AVATAR_SIZE} height={AVATAR_SIZE} fit="cover" />
                </ClipOval>
              </Container>
            </Center>
          </Positioned>
        </Stack>
      </SizedBox>
      <SizedBox height={12} />
      <Text style={{ fontSize: 22, fontWeight: "bold" }} textAlign="center">
        {props.name}
      </Text>
      <SizedBox height={4} />
      <Text style={{ fontSize: 14, color: "#9E9E9E" }} textAlign="center">
        {props.handle}
      </Text>
      <SizedBox height={16} />
      <Row>
        <Stat value={props.posts} label="Posts" />
        <Stat value={props.followers} label="Followers" />
        <Stat value={props.following} label="Following" />
      </Row>
      <SizedBox height={16} />
    </Column>
  );
}
