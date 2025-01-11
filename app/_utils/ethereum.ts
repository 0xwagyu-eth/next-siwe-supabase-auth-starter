export function formatEthAddress(address: string): string {
    // Check if the address is valid
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error("Invalid Ethereum address");
    }
  
    // Extract the middle part of the address and limit it to 10 characters
    const middlePart = address.substring(6, 22);
  
    // Format the address with the middle part replaced by ellipsis
    const formattedAddress = `${address.substring(0, 6)}...${address.substring(
      34
    )}`;
  
    return formattedAddress;
  }