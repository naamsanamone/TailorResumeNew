export const ProfileName = ({ name }: { name: string }) => {
  return (
    <h3
      className="text-3xl font-medium max-w-full overflow-hidden text-ellipsis whitespace-nowrap m-0"
      title={name}
    >
      {name}
    </h3>
  );
};
