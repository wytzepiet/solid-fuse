import { View, Text, Image, Stack, Positioned } from "solid-fuse";

const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 96;
const RING = 4;
const AVATAR_OUTER = AVATAR_SIZE + RING * 2;

function Stat(props: { label: string; value: number }) {
  return (
    <View grow={1} flex={{ direction: "column", align: "center", gap: 2 }}>
      <Text fontSize={18} fontWeight="bold" color="#111111">
        {`${props.value}`}
      </Text>
      <Text fontSize={12} color="#888888">
        {props.label}
      </Text>
    </View>
  );
}

export function ProfileHeader(props: {
  bannerUrl: string;
  avatarUrl: string;
  name: string;
  handle: string;
  posts: number;
  followers: number;
  following: number;
}) {
  return (
    <View flex={{ direction: "column", align: "stretch" }} decoration={{ color: "#FFFFFF" }}>
      <Stack>
        {/* Sizes the stack: banner plus the half of the avatar that hangs below it */}
        <View height={BANNER_HEIGHT + AVATAR_SIZE / 2} />
        <Positioned top={0} left={0} right={0}>
          <Image src={props.bannerUrl} height={BANNER_HEIGHT} fit="cover" />
        </Positioned>
        <Positioned top={BANNER_HEIGHT - AVATAR_SIZE / 2 - RING} left={0} right={0}>
          <View flex={{ direction: "row", justify: "center" }}>
            <View
              width={AVATAR_OUTER}
              height={AVATAR_OUTER}
              padding={RING}
              decoration={{ color: "#FFFFFF", borderRadius: AVATAR_OUTER / 2 }}
            >
              {/* No clip prop is known from the primer: the circular crop relies on the rounded decoration clipping its child */}
              <View
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                decoration={{ color: "#DDDDDD", borderRadius: AVATAR_SIZE / 2 }}
              >
                <Image src={props.avatarUrl} width={AVATAR_SIZE} height={AVATAR_SIZE} fit="cover" />
              </View>
            </View>
          </View>
        </Positioned>
      </Stack>
      <View
        flex={{ direction: "column", align: "center", gap: 4 }}
        padding={{ top: 12, left: 16, right: 16 }}
      >
        <Text fontSize={22} fontWeight="bold" color="#111111">
          {props.name}
        </Text>
        <Text fontSize={14} color="#888888">
          {props.handle}
        </Text>
      </View>
      <View flex={{ direction: "row" }} padding={{ horizontal: 16, vertical: 16 }}>
        <Stat label="Posts" value={props.posts} />
        <Stat label="Followers" value={props.followers} />
        <Stat label="Following" value={props.following} />
      </View>
    </View>
  );
}
