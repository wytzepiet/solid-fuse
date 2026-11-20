import { View, Text, Image, Stack, Positioned } from "solid-fuse";

const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 96;
const RING = 4;
const AVATAR_OUTER = AVATAR_SIZE + RING * 2;

function Stat(props: { value: number; label: string }) {
  return (
    <View grow={1} flex={{ direction: "column", align: "center", gap: 2 }}>
      <Text fontSize={18} fontWeight="bold">
        {String(props.value)}
      </Text>
      <Text fontSize={12} color="grey">
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
    <View flex={{ direction: "column" }}>
      {/* Banner plus the half of the avatar that hangs below it */}
      <View height={BANNER_HEIGHT + AVATAR_SIZE / 2}>
        <Stack>
          <Positioned top={0} left={0} right={0} height={BANNER_HEIGHT}>
            <Image src={props.bannerUrl} height={BANNER_HEIGHT} fit="cover" />
          </Positioned>
          <Positioned top={BANNER_HEIGHT - AVATAR_OUTER / 2} left={0} right={0}>
            <View flex={{ direction: "row", justify: "center" }}>
              {/* No known clip prop: the white ring is circular, but the image itself may not be clipped to a circle. */}
              <View
                width={AVATAR_OUTER}
                height={AVATAR_OUTER}
                flex={{ direction: "column", align: "center", justify: "center" }}
                decoration={{
                  color: "white",
                  borderRadius: AVATAR_OUTER / 2,
                  border: { color: "white", width: RING },
                }}
              >
                <Image src={props.avatarUrl} width={AVATAR_SIZE} height={AVATAR_SIZE} fit="cover" />
              </View>
            </View>
          </Positioned>
        </Stack>
      </View>

      {/* Name and handle */}
      <View padding={{ top: 12 }} flex={{ direction: "row", justify: "center" }}>
        <View flex={{ direction: "column", align: "center", gap: 2 }}>
          <Text fontSize={22} fontWeight="bold">
            {props.name}
          </Text>
          <Text fontSize={14} color="grey">
            {props.handle}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View padding={{ vertical: 16 }} flex={{ direction: "row" }}>
        <Stat value={props.posts} label="Posts" />
        <Stat value={props.followers} label="Followers" />
        <Stat value={props.following} label="Following" />
      </View>
    </View>
  );
}
