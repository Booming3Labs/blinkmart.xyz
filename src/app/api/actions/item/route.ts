import {
  ACTIONS_CORS_HEADERS,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
} from "@solana/actions";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";

export const runtime = "edge";
import { getRequestContext } from "@cloudflare/next-on-pages";

const amount = 1;
const toPubkey = new PublicKey("Bm3iBh2Th3n1QjJg1LLYfmpuqbV5V2dBomaEk5utsy8a");
// create the standard headers for this route (including CORS)
const headers = createActionHeaders({ chainId: "mainnet-beta", actionVersion: "1" });
export const GET = (req: Request) => {

  const { env } = getRequestContext();

  console.log("runtime edge")
  console.log(/variable/);
  console.log(env.TEST);
  console.log(`rpc: ${env.RPC_URL_MAINNET}`);
  console.log(/variable/);
  console.log( "runtime edge")

  try {
    const requestUrl = new URL(req.url);
    const baseHref = new URL(
      `/api/actions/item`,
      requestUrl.origin
    ).toString();
    const payload: ActionGetResponse = {
      icon: new URL("/MusicBox.png", new URL(req.url).origin).toString(),
      title: "MusicBox",
      disabled: false,
      description:
        `We have pioneered a Web3 music box integrating visual, auditory, and gustatory experiences. `,
      label: "Demo",
      links: {
        actions: [
          {
            label: "Buy 1 SOL",
            href: `${baseHref}`,
          },
        ],
      },
    };
    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return new Response("Invalid 'account' provided", {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const transaction = new Transaction();

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: toPubkey,
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    );

    transaction.feePayer = account;

    const { env } = getRequestContext();

    console.log(/rpc/);
    console.log(env.RPC_URL_MAINNET);
    console.log(/rpc/);

    const connection = new Connection(
      env.RPC_URL_MAINNET ?? clusterApiUrl("mainnet-beta")
    );
    // 添加重试逻辑
    const getRecentBlockhash = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const { blockhash } = await connection.getLatestBlockhash();
          return blockhash;
        } catch (error) {
          console.error(`获取最新区块哈希失败，尝试次数：${i + 1}`, error);
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒后重试
        }
      }
    };
    transaction.recentBlockhash = await getRecentBlockhash();
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
      },
    });
    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    return Response.json("An unknow error occurred", { status: 400 });
  }
};