import MDE from "../src/server/services/database/MDE";
import myJsonfile from "../test/myjsonfile.json";

const instance = new MDE({
    prefix: "",
    searchData: async (search) => {
        return myJsonfile.filter((node) => 
            search.test(node.path)
        )
    }
})


const path = "ivipcoin-db::movement_wallet/000523147298669313/history/1677138262468";
const value = {
	type: "deposit",
	wallet_type:
		"Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.....",
	payment_method: "bolbradesco",
	original_amount: 603,
	total_amount: [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }],
	id: 1311772470,
	operation_type: "regular_payment",
	payment_type: "ticket",
	status: {
		payment_method:
			"Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.....",
		original_amount: 603,
		total_amount: 606.49,
		id: [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }],
		operation_type: "regular_payment",
		payment_type: "ticket",
		currency_id: "BRL",
		history_id: "1677138262468",
		striue50:
			"Valor da string maior Valor Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres... da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres...",
	},
	status_detail: "pending_waiting_payment",
	currency_id: "BRL",
	history_id: "1677138262468",
};

const options = { assert_revision: "algum_valor" };
const results = instance.set(path, value, options);

console.log(JSON.stringify(results, null, 2));