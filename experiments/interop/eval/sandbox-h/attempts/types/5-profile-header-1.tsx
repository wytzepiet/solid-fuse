import { Image, Positioned, Stack, Text, View } from "solid-fuse";

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
    <View grow={1} flex={{ align: "center", gap: 2 }}>
      <Text fontSize={18} fontWeight="bold" color="#111111">
        {String(props.value)}
      </Text>
      <Text fontSize={12} color="grey">
        {props.label}
      </Text>
    </View>
  );
}

export function ProfileHeader(props: ProfileHeaderProps) {
  return (
    <View flex={{ align: "stretch" }} decoration={{ color: "white" }}>
      <Stack>
        {/* Sizes the stack: banner plus the half of the avatar that hangs below it. */}
        <View height={BANNER_HEIGHT + AVATAR_OUTER / 2} />
        <Positioned top={0} left={0} right={0} height={BANNER_HEIGHT}>
          <Image src={props.bannerUrl} height={BANNER_HEIGHT} fit="cover" />
        </Positioned>
        <Positioned
          top={BANNER_HEIGHT - AVATAR_OUTER / 2}
          left={0}
          right={0}
          height={AVATAR_OUTER}
        >
          <View alignment="center">
            <View
              width={AVATAR_OUTER}
              height={AVATAR_OUTER}
              padding={RING_WIDTH}
              decoration={{ color: "white", shape: "circle" }}
            >
              <Image
                src={props.avatarUrl}
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                fit="cover"
                borderRadius={AVATAR_SIZE / 2}
              />
            </View>
          </View>
        </Positioned>
      </Stack>
      <View
        flex={{ align: "center", gap: 4 }}
        padding={{ top: 12, left: 16, right: 16 }}
      >
        <Text fontSize={22} fontWeight="bold" color="#111111" textAlign="center">
          {props.name}
        </Text>
        <Text fontSize={14} color="grey" textAlign="center">
          {props.handle}
        </Text>
      </View>
      <View
        flex={{ direction: "horizontal", align: "center" }}
        padding={{ horizontal: 16, vertical: 16 }}
      >
        <Stat value={props.posts} label="Posts" />
        <Stat value={props.followers} label="Followers" />
        <Stat value={props.following} label="Following" />
      </View>
    </View>
  );
}
