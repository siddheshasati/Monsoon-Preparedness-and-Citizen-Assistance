from fastapi import APIRouter, Depends
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.auth import get_current_user
from backend.app.database import User

router = APIRouter(prefix="/chat", tags=["AI Assistant"])

class Message(BaseModel):
    role: str  # user, assistant
    text: str

class ChatPayload(BaseModel):
    messages: list[Message]
    language: str = "English"

# Rule-based fallback replies mirroring frontend fake replies
def get_fallback_reply(query: str) -> str:
    q0 = query.lower()
    if any(k in q0 for k in ["travel", "safe", "route", "go out", "andheri"]):
        return ("Not recommended right now. Andheri Subway is waterlogged and heavy rainfall (>50mm/hr) "
                "is expected until 9 PM. Safer alternative: take the Metro from Bandra to Ghatkopar and "
                "cab from there. I'll monitor and alert you when conditions improve.")
    if any(k in q0 for k in ["kit", "bag", "items", "checklist"]):
        return ("Here's your personalized kit: 🔦 torch + spare batteries, 🩹 first-aid, 💊 3-day medication, "
                "🥫 dry food (3 days), 💧 6L water/person, 📱 power bank, 🆔 ID copies (waterproof pouch), "
                "🔑 spare keys, 💵 ₹2000 cash, 🐕 pet supplies. Want me to order missing items?")
    if any(k in q0 for k in ["shelter", "hospital", "police"]):
        return ("Closest is BMC School Shelter, Dadar (1.2 km, 118 beds free). Route via Tulsi Pipe Rd "
                "avoids waterlogged Hindmata. Want me to share your ETA with family?")
    return ("I've pulled the latest weather, flood risk and community reports around you. "
            "Rainfall will peak at 8 PM (~22mm/hr). Recommend staying indoors, moving valuables "
            "above ground floor, and charging devices. Anything specific I should help with?")

@router.post("")
async def chat_assistant(
    payload: ChatPayload,
    current_user: User = Depends(get_current_user)
):
    user_query = payload.messages[-1].text if payload.messages else ""
    
    # If Groq Key is available, call Groq Llama model via LangChain
    if settings.GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
            from langchain_core.messages import HumanMessage, AIMessage
            
            llm = ChatGroq(
                temperature=0.1,  # Low temperature to avoid creative hallucinations
                groq_api_key=settings.GROQ_API_KEY,
                model_name="llama-3.3-70b-versatile"
            )
            
            system_instruction = (
                "You are 'Monsoon Copilot', a specialized AI Safety Assistant created to help citizens, volunteers, "
                "and disaster management coordinators prepare for and navigate monsoon hazards, flooding, severe weather, and waterlogging.\n\n"
                "STRICT GUARDRAILS & TOPIC LIMITS:\n"
                "1. Scope: You must ONLY answer queries related to monsoons, weather forecasts, disaster preparedness, emergency checklists, "
                "flood zones, safety procedures, evacuation guidelines, volunteer missions, and community alerts. If a user asks about unrelated topics "
                "(e.g., coding help, generic pop culture, financial math, etc.), you must politely decline to answer and remind them of your core role as a monsoon safety copilot.\n"
                "2. Prevent Hallucination: Do NOT fabricate phone numbers, shelter locations, water levels, or weather predictions. If you do not have "
                "real-time data for a specific area, clearly state it and direct the user to check local official broadcasts (like the IMD or BMC) or the live community reports feed.\n"
                "3. Safe Advice: Always recommend caution. Advise against driving or walking through flooded roads, staying near structural walls, or handling loose electrical lines. Recommend official disaster helplines: BMC Disaster Control (1916), National Disaster Response Force (NDRF) (1078), or police (100).\n"
                "4. Language: Answer in " + payload.language + ". Use clean formatting, bullets, and emojis to ensure ease of reading during stress or emergencies."
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_instruction),
                MessagesPlaceholder(variable_name="history"),
                ("user", "{input}")
            ])
            
            # Map history messages to LangChain types
            history = []
            for msg in payload.messages[:-1]:
                if msg.role == "user":
                    history.append(HumanMessage(content=msg.text))
                else:
                    history.append(AIMessage(content=msg.text))
            
            chain = prompt | llm
            res = chain.invoke({
                "history": history,
                "input": user_query
            })
            return {"role": "ai", "text": res.content.strip()}
        except Exception:
            pass  # Fallback to local rule engine if Groq fails
            
    # Fallback to local rules
    reply_text = get_fallback_reply(user_query)
    return {"role": "ai", "text": reply_text}
